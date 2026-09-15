import type PipeBomb from "@pipe-bomb/plugin-sdk";
import { LocalLibrary } from "./local.library-handler.js";
import { LocalAttributeSource } from "./local.attribute-source.js";
import { LocalLibraryConfigManager } from "./local-library.config-manager.js";
import { Library } from "./interface/library.interface.js";
import { LibraryManager } from "./library-manager.js";

export default class Plugin implements PipeBomb.Plugin {
	private api!: PipeBomb.PluginApiContext;
	private logger!: PipeBomb.Logger;

	private library: LocalLibrary | null = null;
	private disableCallbacks = new Set<() => void>();

	enable(apiContext: PipeBomb.PluginApiContext) {
		this.api = apiContext;
		this.disableCallbacks = new Set();

		this.logger = apiContext.getLogger();

		this.api.registerLanguageDirectory("language");

		const config = new LocalLibraryConfigManager(this.logger);
		const libraryManager = new LibraryManager(
			this.logger,
			this.api.registerLibraryHandler,
			this.api.unregisterLibraryHandler,
		);

		const listener = (libraries: Library[]) => libraryManager.update(libraries);
		config.addListener(listener);
		this.disableCallbacks.add(() => config.removeListener(listener));

		this.api.registerConfigManager(config);

		const attributeSource = new LocalAttributeSource();
		this.api.registerAttributeSource(attributeSource);
	}

	disable() {
		this.library = null;
		for (const callback of this.disableCallbacks) {
			callback();
		}
		this.disableCallbacks = new Set();
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
