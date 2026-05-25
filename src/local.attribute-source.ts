import {
	AlbumInformationHelper,
	AlbumMetadata,
	ArtistInformationHelper,
	ArtistMetadata,
	AttributeSource,
	AttributeSourceApiContext,
	AttributeValue,
	TrackInformationHelper,
	TrackMetadata,
} from "@sdk";
import { parseStream } from "music-metadata";
import mime from "mime";

export class LocalAttributeSource implements AttributeSource {
	private api!: AttributeSourceApiContext;

	public readonly id = "file-metadata";

	getName() {
		return "Local file metadata";
	}

	getDependencies() {
		return [];
	}
	getSoftDependencies() {
		return [];
	}

	enable(attributeSourceApiContext: AttributeSourceApiContext): void {
		this.api = attributeSourceApiContext;

		this.api.registerTrackAttributes([
			{
				key: "title",
				type: "string",
				supportsMultiple: false,
			},
			{
				key: "artist",
				type: "string",
				supportsMultiple: true,
			},
			{
				key: "album",
				type: "string",
				supportsMultiple: false,
			},
			{
				key: "genre",
				type: "string",
				supportsMultiple: true,
			},
			{
				key: "label",
				type: "string",
				supportsMultiple: true,
			},
			{
				key: "release_type",
				type: "string",
				supportsMultiple: true,
			},
			{
				key: "front",
				type: "buffer",
				supportsMultiple: false,
			},
		]);
	}

	async getTrackAttributeValues(
		helper: TrackInformationHelper,
	): Promise<TrackMetadata> {
		const producer = await helper.getAudioProducer("stream");
		if (!producer) {
			return {
				attributes: null,
				artists: null,
			};
		}

		const stream = await producer.getStream();

		const metadata = await parseStream(stream);
		// console.log(metadata);

		const attributes: AttributeValue[] = [];

		const commonTags = metadata.common;
		// console.log(commonTags);

		if (commonTags.title) {
			attributes.push({
				key: "title",
				value: commonTags.title,
			});
		}

		if (commonTags.artists) {
			attributes.push(
				...commonTags.artists.map((artist) => ({
					key: "artist",
					value: artist,
				})),
			);
		} else if (commonTags.artist) {
			attributes.push({
				key: "artist",
				value: commonTags.artist,
			});
		}

		if (commonTags.album) {
			attributes.push({
				key: "album",
				value: commonTags.album,
			});
		}

		if (commonTags.genre) {
			attributes.push(
				...commonTags.genre
					.flatMap((genre) => genre.split(";"))
					.map((genre) => ({
						key: "genre",
						value: genre,
					})),
			);
		}

		if (commonTags.label) {
			attributes.push(
				...commonTags.label.map((label) => ({
					key: "label",
					value: label,
				})),
			);
		}

		if (commonTags.releasetype) {
			attributes.push(
				...commonTags.releasetype.map((releaseType) => ({
					key: "release_type",
					value: releaseType,
				})),
			);
		}

		if (commonTags.picture?.length) {
			const picture =
				commonTags.picture.find(
					(picture) => picture.type?.toLowerCase() == "cover (front)",
				) ??
				commonTags.picture[0] ??
				null;

			if (picture) {
				const buffer = Buffer.from(picture.data);
				const extension = mime.getExtension(picture.format);

				// todo: verify that extension is an image
				if (extension) {
					attributes.push({
						key: "front",
						value: {
							buffer,
							extension,
						},
					});
				}
			}
		}

		return {
			artists: null,
			attributes,
		};
	}

	async getArtistAttributeValues(
		_helper: ArtistInformationHelper,
	): Promise<ArtistMetadata> {
		return {
			attributes: null,
		};
	}

	async getAlbumAttributeValues(
		_helper: AlbumInformationHelper,
	): Promise<AlbumMetadata> {
		return {
			attributes: null,
			artists: null,
		};
	}
}
