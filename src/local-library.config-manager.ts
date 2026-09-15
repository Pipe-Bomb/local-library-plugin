import {
	ConfigManager,
	ConfigManagerApiContext,
	ConfigNode,
	Logger,
} from "@pipe-bomb/plugin-sdk";
import { Library } from "./interface/library.interface.js";
import { createHash } from "crypto";

export class LocalLibraryConfigManager implements ConfigManager {
	private api!: ConfigManagerApiContext;
	private readonly updateListeners = new Set<(libraries: Library[]) => void>();

	constructor(private readonly logger: Logger) {}

	async enable(
		configManagerApiContext: ConfigManagerApiContext,
	): Promise<void> {
		this.api = configManagerApiContext;
		await this.emit();
	}

	public async getLibraries() {
		const libraryIds = await this.api.getValue("library_ids", "string", true);

		const libraries: Library[] = [];

		for (const libraryId of libraryIds ?? []) {
			const libPath = await this.api.getValue(
				`library:path:${libraryId}`,
				"string",
			);
			const libName = await this.api.getValue(
				`library:name:${libraryId}`,
				"string",
			);
			libraries.push({
				id: libraryId,
				path: libPath,
				name: libName,
			});
		}

		const legacyLibraryPath = await this.api.getValue("library_path", "string");
		if (legacyLibraryPath) {
			const id = createHash("sha1").update(legacyLibraryPath).digest("hex");
			if (libraries.some((lib) => lib.id == id)) {
				this.logger.debug(
					"Removing legacy library because it's already been converted.",
				);
				await this.api.delete("library_path");
			} else {
				this.logger.warn(
					"Legacy library hasn't been converted. Save config without making any changes to convert.",
				);
				libraries.push({
					id: createHash("sha1").update(legacyLibraryPath).digest("hex"),
					path: legacyLibraryPath,
					name: "Local Library (Legacy)",
				});
			}
		}

		return libraries;
	}

	async getConfigOptions(): Promise<ConfigNode> {
		const libraries = await this.getLibraries();

		return {
			type: "section",
			children: [
				{
					type: "section",
					children: libraries.map((library) => ({
						type: "section",
						children: [
							{
								type: "heading",
								content: library.name ?? "Unnamed Library",
								size: "sm",
							},
							{
								type: "paragraph",
								content:
									"Changing the ID of the library will cause all tracks to be considered new, potentially removing them from playlists. Remove the ID and save to delete the library.",
							},
							{
								type: "text",
								value: library.id,
								id: `library:id:${library.id}`,
								placeholder: "my-library",
								name: "Library ID",
							},
							{
								type: "text",
								value: library.name ?? "",
								id: `library:name:${library.id}`,
								placeholder: "My Library",
								name: "Library name",
							},
							{
								type: "text",
								value: library.path ?? "",
								id: `library:path:${library.id}`,
								placeholder: "/home/eyezah/Music",
								name: "Library path",
							},
						],
					})),
				},
				{
					type: "section",
					children: [
						{
							type: "heading",
							content: "Create new library",
							size: "md",
						},
						{
							type: "text",
							value: "",
							id: `new:id`,
							placeholder: "new-library",
							name: "New library ID",
						},
					],
				},
			],
		};
	}

	getLibraryPath() {
		return this.api.getValue("library_path", "string");
	}

	async update(values: Record<string, any>): Promise<ConfigNode> {
		const existingLibraries = await this.getLibraries();
		const orphanedLibraryIds = new Set(existingLibraries.map((lib) => lib.id));
		const newlibraryIds: string[] = [];

		for (const [key, value] of Object.entries(values)) {
			if (key.startsWith("library:id:")) {
				const libraryId = key.substring("library:id:".length);
				if (value) {
					if (libraryId != value) {
						this.logger.log(
							`Library "${libraryId}" has had its ID changed to "${value}".`,
						);
					}
					orphanedLibraryIds.delete(value);
					newlibraryIds.push(value);
					let name = values[`library:name:${libraryId}`];
					if (typeof name == "string") {
						if (name.trim()) {
							await this.api.setValue(
								`library:name:${value}`,
								"string",
								name.trim(),
							);
						} else {
							await this.api.delete(`library:name:${value}`);
						}
					}

					let path = values[`library:path:${libraryId}`];
					if (typeof path == "string") {
						if (path.trim()) {
							await this.api.setValue(
								`library:path:${value}`,
								"string",
								path.trim(),
							);
						} else {
							await this.api.delete(`library:path:${value}`);
						}
					}
				} else {
					this.logger.log(`Library "${libraryId}" has been removed.`);
				}
			}
		}

		if ("new:id" in values) {
			const newId = values["new:id"];
			if (typeof newId == "string" && newId.trim()) {
				if (!newlibraryIds.includes(newId)) {
					newlibraryIds.push(newId);
				}
			}
		}

		await this.api.setValue("library_ids", "string", newlibraryIds);

		for (const id of orphanedLibraryIds) {
			await this.api.delete(`library:name:${id}`);
			await this.api.delete(`library:path:${id}`);
		}

		await this.emit();

		return this.getConfigOptions();
	}

	private async emit() {
		const libraries = await this.getLibraries();
		for (const callback of this.updateListeners) {
			callback(libraries);
		}
	}

	addListener(listener: (libraries: Library[]) => void) {
		this.updateListeners.add(listener);
	}

	removeListener(listener: (libraries: Library[]) => void) {
		this.updateListeners.delete(listener);
	}
}
