import { LibraryHandler, Logger } from "@pipe-bomb/plugin-sdk";
import { Library } from "./interface/library.interface.js";
import { LocalLibrary } from "./local.library-handler.js";

export class LibraryManager {
	private readonly libraries = new Map<string, LocalLibrary>();

	constructor(
		private readonly logger: Logger,
		private readonly registerHandler: (handler: LibraryHandler) => void,
		private readonly unregisterHandler: (handler: LibraryHandler) => void,
	) {}

	update(libraries: Library[]) {
		const newKeys = libraries.map((lib) => lib.id);
		for (const [key, library] of this.libraries.entries()) {
			if (!newKeys.includes(key)) {
				this.logger.log(`Unregistering library "${library.id}"`);
				this.unregisterHandler(library);
				this.libraries.delete(key);
			}
		}

		for (const meta of libraries) {
			if (meta.path) {
				const library = this.libraries.get(meta.id);
				if (library) {
					library.setName(meta.name ?? "Unnamed library");
					library.setPath(meta.path);
				} else {
					this.logger.log(`Registering library "${meta.id}"`);
					const library = new LocalLibrary(
						meta.id,
						meta.path,
						meta.name ?? "Unnamed library",
						this.logger,
					);
					this.libraries.set(meta.id, library);
					this.registerHandler(library);
				}
			}
		}
	}
}
