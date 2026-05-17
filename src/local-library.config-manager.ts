import { ConfigManager, ConfigManagerApiContext, ConfigNode } from "@sdk";

export class LocalLibraryConfigManager implements ConfigManager {
	private api!: ConfigManagerApiContext;

	enable(
		configManagerApiContext: ConfigManagerApiContext,
	): void | Promise<void> {
		this.api = configManagerApiContext;
	}

	async getConfigOptions(): Promise<ConfigNode> {
		return {
			type: "section",
			children: [
				{
					type: "text",
					id: "library_path",
					name: "Library path",
					placeholder: "/home/eyezah/Music",
					value: (await this.getLibraryPath()) ?? "",
				},
			],
		};
	}

	getLibraryPath() {
		return this.api.getValue("library_path", "string");
	}

	async update(values: Record<string, any>): Promise<ConfigNode> {
		const path = values["library_path"];

		if (typeof path == "string") {
			await this.api.setValue("library_path", "string", path);
		}

		return this.getConfigOptions();
	}
}
