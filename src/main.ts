import type PipeBomb from "@sdk";
import { LocalLibrary } from "./local.library-handler.js";
import { LocalAttributeSource } from "./local.attribute-source.js";
import { LocalLibraryConfigManager } from "./local-library.config-manager.js";

export default class Plugin implements PipeBomb.Plugin {
	private api!: PipeBomb.PluginApiContext;
	private logger!: PipeBomb.Logger;

	enable(apiContext: PipeBomb.PluginApiContext) {
		this.api = apiContext;
		this.logger = apiContext.getLogger();

		this.api.registerLanguageDirectory("language");

		const config = new LocalLibraryConfigManager();
		this.api.registerConfigManager(config);

		config.getLibraryPath().then((path) => {
			if (path) {
				const library = new LocalLibrary(this, path, "Local Library");
				this.api.registerLibraryHandler(library);
			}
		});

		const attributeSource = new LocalAttributeSource();
		this.api.registerAttributeSource(attributeSource);
	}

	disable() {}

	public getLogger() {
		return this.logger;
	}

	public getApi() {
		return this.api;
	}
}
