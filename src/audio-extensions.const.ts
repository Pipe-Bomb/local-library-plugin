const AUDIO_EXTENSIONS: string[] = [
	"mp3",
	"flac",
	"m4a",
	"aac",
	"ogg",
	"opus",
	"wav",
	"aiff",
	"alac",
	"wma",
	"ape",
	"wv", // wavpack
	"mpc", // musepack
	"tta", // true audio
	"amr",
	"3gp",
	"3g2",
	"mka", // matroska audio
	"webm", // sometimes audio-only
] as const;

export default AUDIO_EXTENSIONS;
