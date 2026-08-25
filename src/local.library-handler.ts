import type {
	AudioProducer,
	AudioProducerType,
	LibraryHandler,
	LibraryHandlerApiContext,
	Logger,
	TaskRunContext,
	Track,
} from "@pipe-bomb/plugin-sdk";
import * as fs from "fs/promises";
import path from "path";
import { compare } from "./utils.js";
import { createHash } from "crypto";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import AUDIO_EXTENSIONS from "./audio-extensions.const.js";
import { parseStream } from "music-metadata";
import mime from "mime";

export class LocalLibrary implements LibraryHandler {
	public readonly id: string;
	private readonly tracks: Track[] = [];
	private api!: LibraryHandlerApiContext;

	constructor(
		private readonly path: string,
		private readonly name: string,
		private readonly logger: Logger,
	) {
		this.id = createHash("sha1").update(path).digest("hex");
		this.logger.log(`Created local library for "${path}" (${this.id})`);

		// this.scan().catch(plugin.getLogger().error);
	}

	getName() {
		return this.name;
	}

	public enable(libraryApiContext: LibraryHandlerApiContext): void {
		this.api = libraryApiContext;
	}

	private generateTrackId(path: string) {
		// return createHash("sha1").update(path).digest("hex");
		return Buffer.from(path).toString("base64url");
	}

	trackIdToPath(trackId: string) {
		return Buffer.from(trackId, "base64url").toString("utf-8");
	}

	private getPath(trackId: string) {
		return path.join(this.path, this.trackIdToPath(trackId));
	}

	public scanTrackPath(trackPath: string) {
		return this.scanTrackPathWithRunId(trackPath, null);
	}

	private async scanTrackPathWithRunId(
		trackPath: string,
		runId: string | null,
	) {
		if (trackPath.startsWith("/")) {
			trackPath = trackPath.substring(1);
		}

		const filePath = path.join(this.path, trackPath);

		const lstat = await fs.lstat(filePath);
		if (!lstat.isFile()) {
			return false;
		}

		const extension = path.extname(trackPath).substring(1);
		if (!AUDIO_EXTENSIONS.includes(extension)) {
			return false;
		}

		const trackId = this.generateTrackId(trackPath);
		await this.api.addTrack(
			{
				id: trackId,
				title: path.basename(trackPath, path.extname(trackPath)),
			},
			runId,
		);
		return true;
	}

	public async scan(context: TaskRunContext) {
		this.logger.debug(`Scanning "${this.path}"...`);

		const contents = await fs.readdir(this.path, {
			recursive: true,
		});

		const tracks: Track[] = [];

		for (const [index, file] of contents.entries()) {
			context.update(index / contents.length);

			await this.scanTrackPathWithRunId(file, context.getRunId());

			const progress = Math.round(((index + 1) / contents.length) * 1000) / 10;
			this.logger.debug(`Scanning "${this.path}"... (${progress}%)`);
		}

		tracks.sort((a, b) =>
			compare(a.title.toLowerCase(), b.title.toLowerCase()),
		);

		this.tracks.splice(0, this.tracks.length, ...tracks);
		this.logger.log(
			`After scan the Library contains ${this.tracks.length} Tracks`,
		);
	}

	async doTracksExist(trackIds: string[]): Promise<string[]> {
		const existingIds: string[] = [];
		for (const trackId of trackIds) {
			const filePath = this.getPath(trackId);
			try {
				await stat(filePath);
				existingIds.push(filePath);
			} catch (e: any) {
				if (e?.code == "ENOENT") {
					this.logger.warn(`File ${filePath} no longer exists`);
					continue;
				}
				this.logger.warn(`Failed to get file stats for ${filePath}`);
			}
		}
		return existingIds;
	}

	async getAudioProducer(
		trackId: string,
		type: AudioProducerType | null,
	): Promise<AudioProducer | null> {
		if (type && type != "stream") {
			return null;
		}

		const filePath = this.getPath(trackId);
		try {
			const stats = await stat(filePath);

			return {
				type: "stream",
				cacheable: false,
				getMetadata: async () => {
					const mimeType = mime.getType(filePath);
					if (!mimeType) {
						throw new Error("Unknown mime type");
					}

					return {
						size: stats.size,
						mimeType,
					};
				},
				getStream: async () => createReadStream(filePath),
				getDuration: async () => {
					const metadata = await parseStream(createReadStream(filePath));
					if (metadata.format.duration) {
						return metadata.format.duration;
					}
					throw new Error("Failed to get duration");
				},
				getPart: async (start, end) =>
					createReadStream(filePath, {
						start,
						end,
					}),
			};
		} catch (e: any) {
			if (e?.code == "ENOENT") {
				await this.api.removeTrack(trackId);
				throw new Error(`File "${filePath}" not found`);
			}
			throw e;
		}
	}
}
