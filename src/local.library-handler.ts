import type {
	AudioProducer,
	AudioProducerType,
	LibraryHandler,
	LibraryHandlerApiContext,
	LibraryTrackInformationHelper,
	Logger,
	TaskRunContext,
	Track,
} from "@sdk";
import Plugin from "./main.js";
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
	private readonly logger: Logger;
	private readonly tracks: Track[] = [];
	private api!: LibraryHandlerApiContext;

	constructor(
		private readonly plugin: Plugin,
		private readonly path: string,
		private readonly name: string,
	) {
		this.logger = plugin.getLogger();
		this.id = createHash("sha1").update(path).digest("hex");
		this.logger.log(`Created local library for "${path}" (${this.id})`);

		// this.scan().catch(plugin.getLogger().error);
	}

	getName() {
		return this.name;
	}

	public enable(libraryApiContext: LibraryHandlerApiContext): void {
		this.api = libraryApiContext;

		this.api.registerPluginTask({
			id: `scan_${this.id}`,
			resumable: false,
			run: (context) => this.scan(context),
		});
	}

	private generateTrackId(path: string) {
		// return createHash("sha1").update(path).digest("hex");
		return Buffer.from(path).toString("base64url");
	}

	trackIdToPath(trackId: string) {
		return Buffer.from(trackId, "base64url").toString("utf-8");
	}

	private getPath(track: Track) {
		return path.join(this.path, this.trackIdToPath(track.id));
	}

	public async scan(context: TaskRunContext) {
		this.logger.debug(`Scanning "${this.path}"...`);

		const contents = await fs.readdir(this.path, {
			recursive: true,
		});

		const tracks: Track[] = [];

		for (const [index, file] of contents.entries()) {
			context.update(index / contents.length);
			const filePath = path.join(this.path, file);

			const lstat = await fs.lstat(filePath);
			if (!lstat.isFile()) {
				continue;
			}

			const extension = path.extname(file).substring(1);
			if (!AUDIO_EXTENSIONS.includes(extension)) {
				continue;
			}

			const trackId = this.generateTrackId(file);
			await this.api.addTrack({
				id: trackId,
				title: path.basename(file, path.extname(file)),
			});

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

	async getAudioProducer(
		track: Track,
		type: AudioProducerType | null,
	): Promise<AudioProducer | null> {
		if (type && type != "stream") {
			return null;
		}

		const filePath = this.getPath(track);

		return {
			type: "stream",
			cacheable: false,
			getMetadata: async () => {
				const stats = await stat(filePath);
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
	}
}
