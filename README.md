# Local Library Plugin

Scans a directory for audio files and automatically adds them to Pipe Bomb. This plugin also scans audio streams for various audio tags in order to create attributes. This is mostly relevant for local files added by the plugin itself, but it can also detect embedded tags in audio streams from other libraries, if they exist.

## Attributes

This plugin registers the following track attributes:

| Attribute      | Type             | Multiple | Description                                                                 |
| :------------- | ---------------- | -------- | --------------------------------------------------------------------------- |
| `title`        | `string`         | ❌       | The title of the song.                                                      |
| `artist`       | `string`         | ✅       | The name of each artist.                                                    |
| `album`        | `string`         | ❌       | The name of the album.                                                      |
| `genre`        | `string`         | ✅       | The genres of the song                                                      |
| `label`        | `string`         | ✅       | The names of associated record labels.                                      |
| `release_type` | `string`         | ✅       | The release type that the song is a part of. _E.g. "album", "single", "ep"_ |
| `front`        | `buffer` (image) | ❌       | The associated album art.                                                   |

## Installation

Clone the repo into your [Pipe Bomb server's](https://github.com/pipe-bomb/server) `plugins` directory. Then inside, run:

```bash
npm ci
npm run build
```

## Usage

Local Library only recognizes a few file extensions as audio files, outlined in [this file](https://github.com/Pipe-Bomb/local-library-plugin/blob/master/src/audio-extensions.const.ts). This is just to prevent the scanning of non-audio files that may reside in the library directory. If you believe that it's missing an extension, feel free to PR.

## Roadmap

- ➖ Support multiple concurrent libraries

- ➖ Specify custom ID for library instead of relying on library path
