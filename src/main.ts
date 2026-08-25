import type PipeBomb from "@pipe-bomb/plugin-sdk";
import { LocalLibrary } from "./local.library-handler.js";
import { LocalAttributeSource } from "./local.attribute-source.js";
import { LocalLibraryConfigManager } from "./local-library.config-manager.js";

export default class Plugin implements PipeBomb.Plugin {
	private api!: PipeBomb.PluginApiContext;
	private logger!: PipeBomb.Logger;

	private library: LocalLibrary | null = null;

	enable(apiContext: PipeBomb.PluginApiContext) {
		this.api = apiContext;
		this.logger = apiContext.getLogger();

		this.api.registerLanguageDirectory("language");

		const config = new LocalLibraryConfigManager();
		this.api.registerConfigManager(config);

		config.getLibraryPath().then((path) => {
			if (path) {
				this.library = new LocalLibrary(path, "Local Library", this.logger);
				this.api.registerLibraryHandler(this.library);
			}
		});

		const attributeSource = new LocalAttributeSource();
		this.api.registerAttributeSource(attributeSource);
	}

	disable() {
		this.library = null;
	}

	public getLogger() {
		return this.logger;
	}

	public getApi() {
		return this.api;
	}

	public getLibrary() {
		return this.library;
	}
}
