import React from 'react';

import MediaContainer from '../MediaContainer';
import ControllerBar from '../ControllerBar';
// import { getFileHandle, getFileFromHandle } from '../../utils/fileHandleStore';
import { saveFileMetadata, getFileMetadata } from '../../utils/fileMetadataStore';

import { useResizeDetector } from 'react-resize-detector';

// Set the defaults for starting the app
let defaultToolSettings = {
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
			boxCutout: 200,
			circleCutout: 200,
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
	zoomScale: 1,
	zoomMin: 0.25,
	zoomMax: 6,
	// Whether to invert the scroll zoom direction
	swapScrollDirections: false,
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
};

// let defaultAppSettings = {
// 	// Whether to show the tutorial (not implemented yet)
// 	showTutorial: true,
// 	swapScrollDirections: false,
// };

// Check if running in Electron or browser
// In Electron, window.api is exposed by the preload script
const isInElectron = !!(typeof window !== 'undefined' && window.api && window.api.openFile);
const isInBrowser = !isInElectron;

const detectUserOS = (() => {
	if (typeof navigator !== 'undefined') {
		const platform = navigator.platform.toLowerCase();
		if (platform.includes('win')) return 'windows';
		if (platform.includes('mac')) return 'macos';
		if (platform.includes('linux')) return 'linux';
	}
	return 'unknown';
})();

console.log(`Electron: ${isInElectron} | Browser: ${isInBrowser} | OS: ${detectUserOS}`);

function MainContainer() {
	const defaultPlaybackStatus = {
		// Whether the video is playing or paused
		playbackState: 'paused',
		// The current position in the videos, used for syncing the videos
		playbackPosition: 0,
		playbackEndTime: 0,
		// Whether the user is currently scrubbing with the slider
		isScrubbing: false,
	};

	// In Electron, we'll restore files from localStorage paths in useEffect
	// const leftMediaFromMemory = '';
	// const rightMediaFromMemory = '';

	const toolMemory = localStorage.getItem('toolSettings') || '';
	// const appSettingsMemory = localStorage.getItem('appSettings') || '';

	if (toolMemory) {
		defaultToolSettings = JSON.parse(toolMemory);
	} else {
		localStorage.setItem('toolSettings', JSON.stringify(defaultToolSettings));
	}

	const mainContainerElem = React.useRef(null);

	const [toolSettings, setToolSettings] = React.useState(defaultToolSettings),
		[playbackStatus, setPlaybackStatus] = React.useState(defaultPlaybackStatus),
		[leftMedia, setLeftMedia] = React.useState(null),
		[rightMedia, setRightMedia] = React.useState(null),
		[mainContainerSize, setMainContainerSize] = React.useState({ width: window.innerWidth, height: window.innerHeight }),
		// [appSettings, setAppSettings] = React.useState(appSettingsMemory),
		// [pendingFileHandles, setPendingFileHandles] = React.useState(null),
		[userOS, setUserOS] = React.useState(detectUserOS),
		[leftMediaMetaData, setLeftMediaMetaData] = React.useState(null),
		[rightMediaMetaData, setRightMediaMetaData] = React.useState(null);

	const updateMainContainerSize = ({ width, height }) => {
		setMainContainerSize({ width, height });
	};

	const { width, height, ref } = useResizeDetector({
		targetRef: mainContainerElem,
		onResize: updateMainContainerSize,
	});

	const resetStoredSettings = () => {
		localStorage.removeItem('toolSettings');
		localStorage.removeItem('appSettings');
		localStorage.removeItem('leftMediaPath');
		localStorage.removeItem('rightMediaPath');
		window.location.reload();
	};

	// Restore files from saved file handles in browser mode
	// React.useEffect(() => {
	// 	if (isInBrowser && window.showOpenFilePicker) {
	// 		const restoreFiles = async () => {

	// 			const pendingHandles = { left: null, right: null };

	// 			// Try to restore left media
	// 			const leftHandle = await getFileHandle('leftMediaHandle');
	// 			if (leftHandle) {
	// 				// Check if we already have permission (without requesting)
	// 				const hasPermission = (await leftHandle.queryPermission()) === 'granted';
	// 				if (hasPermission) {
	// 					const file = await getFileFromHandle(leftHandle, false);
	// 					if (file) {
	// 						const blobUrl = URL.createObjectURL(file);
	// 						setLeftMedia(blobUrl);
	// 					}
	// 				} else {
	// 					pendingHandles.left = leftHandle;
	// 				}
	// 			}

	// 			// Try to restore right media
	// 			const rightHandle = await getFileHandle('rightMediaHandle');
	// 			if (rightHandle) {
	// 				// Check if we already have permission (without requesting)
	// 				const hasPermission = (await rightHandle.queryPermission()) === 'granted';
	// 				if (hasPermission) {
	// 					const file = await getFileFromHandle(rightHandle, false);
	// 					if (file) {
	// 						const blobUrl = URL.createObjectURL(file);
	// 						setRightMedia(blobUrl);
	// 					}
	// 				} else {
	// 					pendingHandles.right = rightHandle;
	// 				}
	// 			}

	// 			// Store pending handles that need user interaction
	// 			if (pendingHandles.left || pendingHandles.right) {
	// 				setPendingFileHandles(pendingHandles);
	// 			}
	// 		};

	// 		restoreFiles();
	// 	}
	// }, [isInBrowser]);

	// Restore files from saved paths in Electron
	React.useEffect(() => {
		if (!isInBrowser) {
			const restoreElectronFiles = async () => {
				const leftPath = localStorage.getItem('leftMediaPath');
				const rightPath = localStorage.getItem('rightMediaPath');

				// Restore left media from path
				if (leftPath) {
					try {
						const response = await fetch(leftPath);
						const arrayBuffer = await response.arrayBuffer();

						// Determine media type from file extension
						const ext = leftPath.split('.').pop().toLowerCase();
						const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
						const mimeType = isImage ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : 'video/mp4';

						const blob = new Blob([arrayBuffer], { type: mimeType });
						const blobUrl = URL.createObjectURL(blob);

						// Extract filename from path
						const fileName = leftPath.split(/[/\\]/).pop();
						saveFileMetadata(blobUrl, {
							fileName: fileName,
							filePath: leftPath,
							mediaType: isImage ? 'image' : 'video',
						});

						setLeftMedia(blobUrl);
					} catch (error) {
						console.error('Error restoring left media:', error);
						// Clear invalid path
						localStorage.setItem('leftMediaPath', '');
					}
				}

				// Restore right media from path
				if (rightPath) {
					try {
						const response = await fetch(rightPath);
						const arrayBuffer = await response.arrayBuffer();

						// Determine media type from file extension
						const ext = rightPath.split('.').pop().toLowerCase();
						const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
						const mimeType = isImage ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : 'video/mp4';

						const blob = new Blob([arrayBuffer], { type: mimeType });
						const blobUrl = URL.createObjectURL(blob);

						// Extract filename from path
						const fileName = rightPath.split(/[/\\]/).pop();
						saveFileMetadata(blobUrl, {
							fileName: fileName,
							filePath: rightPath,
							mediaType: isImage ? 'image' : 'video',
						});

						setRightMedia(blobUrl);
					} catch (error) {
						console.error('Error restoring right media:', error);
						// Clear invalid path
						localStorage.setItem('rightMediaPath', '');
					}
				}
			};

			restoreElectronFiles();
		}
	}, [isInBrowser]);

	// Function to request permission and restore files (requires user interaction)
	// const restorePendingFiles = async () => {
	// 	if (!pendingFileHandles) return;

	// 	if (pendingFileHandles.left) {
	// 		const file = await getFileFromHandle(pendingFileHandles.left, true);
	// 		if (file) {
	// 			const blobUrl = URL.createObjectURL(file);
	// 			setLeftMedia(blobUrl);
	// 		}
	// 	}

	// 	if (pendingFileHandles.right) {
	// 		const file = await getFileFromHandle(pendingFileHandles.right, true);
	// 		if (file) {
	// 			const blobUrl = URL.createObjectURL(file);
	// 			setRightMedia(blobUrl);
	// 		}
	// 	}

	// 	setPendingFileHandles(null);
	// };

	const PlayerControls = {
		playPause: () => {
			if (leftMedia && rightMedia) {
				setPlaybackStatus(prevStatus => ({
					...prevStatus,
					playbackState: prevStatus.playbackState === 'paused' ? 'playing' : 'paused',
				}));
			}
		},
		play: () => {
			if (leftMedia && rightMedia) {
				setPlaybackStatus(prevStatus => ({
					...prevStatus,
					playbackState: 'playing',
				}));
			}
		},
		pause: () => {
			if (leftMedia && rightMedia) {
				setPlaybackStatus(prevStatus => ({
					...prevStatus,
					playbackState: 'paused',
				}));
			}
		},
		skip: time => {
			if (leftMedia && rightMedia) {
				setPlaybackStatus(prevStatus => ({
					...prevStatus,
					playbackState: 'paused',
					playbackPosition: prevStatus.playbackPosition + time,
				}));
			}
		},
		setCurrentTime: time => {
			if (leftMedia && rightMedia) {
				setPlaybackStatus(prevStatus => ({
					...prevStatus,
					playbackPosition: time,
				}));
			}
		},
		setEndTime: time => {
			if (leftMedia && rightMedia) {
				setPlaybackStatus(prevStatus => ({
					...prevStatus,
					playbackEndTime: time,
				}));
			}
		},
		setIsScrubbing: isScrubbing => {
			if (leftMedia && rightMedia) {
				setPlaybackStatus(prevStatus => ({
					...prevStatus,
					isScrubbing: isScrubbing,
				}));
			}
		},
	};

	// In Electron, save left file path (not blob URL) to localStorage
	React.useEffect(() => {
		if (!isInBrowser && leftMedia) {
			const metadata = getFileMetadata(leftMedia);
			if (metadata?.filePath) {
				localStorage.setItem('leftMediaPath', metadata.filePath);
			}
		} else if (!leftMedia) {
			// Clear if media is removed
			localStorage.removeItem('leftMediaPath');
		}
	}, [leftMedia, isInBrowser]);

	// In Electron, save right file path (not blob URL) to localStorage
	React.useEffect(() => {
		if (!isInBrowser && rightMedia) {
			const metadata = getFileMetadata(rightMedia);
			if (metadata?.filePath) {
				localStorage.setItem('rightMediaPath', metadata.filePath);
			}
		} else if (!rightMedia) {
			// Clear if media is removed
			localStorage.removeItem('rightMediaPath');
		}
	}, [rightMedia, isInBrowser]);

	// Save tool settings to localStorage when they change
	React.useEffect(() => {
        const sanitizedSettings = structuredClone(toolSettings);
        sanitizedSettings.toolOptions.auto = false; // Do not persist 'auto' state
		localStorage.setItem('toolSettings', JSON.stringify(sanitizedSettings));
	}, [toolSettings]);

	// When left or right media are removed, reset mediaMetaData
	React.useEffect(() => {
		if (!leftMedia) {
			setLeftMediaMetaData(null);
		}
		if (!rightMedia) {
			setRightMediaMetaData(null);
		}
	}, [leftMedia, rightMedia]);

    React.useEffect(() => {
        setUserOS(detectUserOS);
    });

	return (
		<div
			id="mainContainer"
			ref={mainContainerElem}
			className={[isInBrowser ? 'browser-mode' : 'electron-mode', toolSettings.controllerBarOptions.floating ? 'floating-tools' : ''].join(' ').trim()}>
			{/* {pendingFileHandles && (
				<div id='restoreFilesPanel'>
					<button
						onClick={restorePendingFiles}
					>
						Restore Previous Files
					</button>
				</div>
			)} */}
			<MediaContainer
				toolSettings={toolSettings}
				// appSettings={appSettings}
				setToolSettings={setToolSettings}
				playbackStatus={playbackStatus}
				leftMedia={leftMedia}
				rightMedia={rightMedia}
				setLeftMedia={setLeftMedia}
				setRightMedia={setRightMedia}
				PlayerControls={PlayerControls}
				mainContainerSize={mainContainerSize}
				leftMediaMetaData={leftMediaMetaData}
				setLeftMediaMetaData={setLeftMediaMetaData}
				rightMediaMetaData={rightMediaMetaData}
				setRightMediaMetaData={setRightMediaMetaData}
				resetStoredSettings={resetStoredSettings}
				isInElectron={isInElectron}
				isInBrowser={isInBrowser}
				userOS={userOS}
			/>
			<ControllerBar
				toolSettings={toolSettings}
				// appSettings={appSettings}
				leftMedia={leftMedia}
				rightMedia={rightMedia}
				setLeftMedia={setLeftMedia}
				setRightMedia={setRightMedia}
				setToolSettings={setToolSettings}
				playbackStatus={playbackStatus}
				PlayerControls={PlayerControls}
				mainContainerSize={mainContainerSize}
				leftMediaMetaData={leftMediaMetaData}
				rightMediaMetaData={rightMediaMetaData}
				isInElectron={isInElectron}
				isInBrowser={isInBrowser}
			/>
		</div>
	);
}

export default MainContainer;
