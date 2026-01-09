// Centralized defaults for tool settings.
// This is imported by MainContainer (state/migration) and can be referenced by settings UI.

const defaultToolSettings = {
	// Which tool to use
	toolMode: 'divider',
	// Options for the tool
	toolOptions: {
		// (Divider only) Whether the divider moves automatically
		auto: false,
		// (Divider only) The animation pattern for the divider
		type: 'backAndForth',
		// Fix the position of the clipper
		stick: false,
		// Settings values for the tools, each tool has its own settings
		value: {
			divider: 30,
			horizontalDivider: 30,
			boxCutout: 200,
			circleCutout: 200,
            overlay: 0.5,
		},
		cutoutValueBounds: {
			boxCutout: { min: 100, max: 500 },
			circleCutout: { min: 100, max: 500 },
		},
	},
	controllerBarOptions: {
		floating: false,
		position: 'bottom',
	},
	// Playback speed for the video
	playerSpeed: 1,
	// Whether to loop the video
	playerLoop: true,
	// The amount of time to skip when the user clicks the skip button in ms
	playerSkipTime: 100,
	playerAudio: {
		left: {
			volume: 0.8,
			muted: true,
		},
		right: {
			volume: 0.8,
			muted: true,
		},
	},
	//* User can adjust these in settings modal
	zoomScale: 1, // 100% (tool control; also has an in-app slider)
	zoomSpeed: 0.02, // 2% per scroll
	invertZoomDirection: false,
	// Whether to invert the scroll zoom direction
	swapScrollDirections: false,
};

export default defaultToolSettings;
