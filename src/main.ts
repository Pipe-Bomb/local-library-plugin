import type PipeBomb from "@sdk";
import { LocalLibrary } from "./local.library-handler.js";
import { LocalAttributeSource } from "./local.attribute-source.js";

export default class Plugin implements PipeBomb.Plugin {
	private api!: PipeBomb.PluginApiContext;
	private logger!: PipeBomb.Logger;

	enable(apiContext: PipeBomb.PluginApiContext) {
		this.api = apiContext;
		this.logger = apiContext.getLogger();

		this.api.registerLanguageDirectory("language");

		// temporary
		// const library = new LocalLibrary(
		// 	this,
		// 	"/home/eyezah/Desktop/Music-Demo",
		// 	"Music Demo",
		// );
		// this.api.registerLibraryHandler(library);

		// const library2 = new LocalLibrary(
		// 	this,
		// 	"/home/eyezah/Desktop/Scott-USB",
		// 	"Scott USB",
		// );
		// this.api.registerLibraryHandler(library2);

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
