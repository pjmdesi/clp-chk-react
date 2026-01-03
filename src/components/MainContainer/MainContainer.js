import React from 'react';

import MediaContainer from '../MediaContainer';
import ControllerBar from '../ControllerBar';
// import { getFileHandle, getFileFromHandle } from '../../utils/fileHandleStore';
import { saveFileMetadata, getFileMetadata } from '../../utils/fileMetadataStore';

import { useResizeDetector } from 'react-resize-detector';
import ModalContainer from '../ModalContainer/ModalContainer';

import defaultToolSettings from '../../settings/defaultToolSettings';
import defaultAppSettings from '../../settings/defaultAppSettings';
import { clampToolZoomScale } from '../../settings/userSettingsSchema';

const isPlainObject = value => {
	return !!value && typeof value === 'object' && !Array.isArray(value);
};

const tryParseJsonObject = value => {
	if (typeof value !== 'string' || !value.trim()) return null;
	try {
		const parsed = JSON.parse(value);
		return isPlainObject(parsed) ? parsed : null;
	} catch {
		return null;
	}
};

const tryCoerceNumberString = value => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (!trimmed) return null;

	// Strict numeric string: integer/float with optional exponent.
	// Examples allowed: "10", "-3.5", ".25", "1e3", "-2.1E-2"
	const numericPattern = /^[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[-+]?\d+)?$/i;
	if (!numericPattern.test(trimmed)) return null;

	const num = Number(trimmed);
	return Number.isFinite(num) ? num : null;
};

// Deep-merge: keep user's existing values when compatible; fill any missing/new keys from defaults.
// Also retains any extra keys the user may already have.
const mergeWithDefaults = (defaults, saved) => {
	if (!isPlainObject(defaults)) {
		return { merged: saved ?? defaults, changed: saved !== defaults };
	}

	const safeSaved = isPlainObject(saved) ? saved : {};
	let changed = false;
	const merged = {};

	for (const key of Object.keys(defaults)) {
		const defaultValue = defaults[key];
		const hasSavedKey = Object.prototype.hasOwnProperty.call(safeSaved, key);

		if (!hasSavedKey) {
			merged[key] = defaultValue;
			changed = true;
			continue;
		}

		const savedValue = safeSaved[key];

		if (isPlainObject(defaultValue) && isPlainObject(savedValue)) {
			const { merged: childMerged, changed: childChanged } = mergeWithDefaults(defaultValue, savedValue);
			merged[key] = childMerged;
			if (childChanged) changed = true;
			continue;
		}

		// Strict: preserve only when types match.
		// Special-case: when default expects a number, allow numeric strings ("100", "0.8").
		if (typeof defaultValue === 'number') {
			if (typeof savedValue === 'number') {
				merged[key] = savedValue;
			} else {
				const coerced = tryCoerceNumberString(savedValue);
				if (coerced !== null) {
					merged[key] = coerced;
					changed = true;
				} else {
					merged[key] = defaultValue;
					changed = true;
				}
			}
			continue;
		}

		if (typeof savedValue === typeof defaultValue) {
			merged[key] = savedValue;
		} else {
			merged[key] = defaultValue;
			changed = true;
		}
	}

	// Keep any unknown keys (forward/backward compatibility)
	for (const key of Object.keys(safeSaved)) {
		if (!Object.prototype.hasOwnProperty.call(defaults, key)) {
			merged[key] = safeSaved[key];
		}
	}

	return { merged, changed };
};

const loadAndMigrateToolSettings = () => {
	const raw = localStorage.getItem('toolSettings') || '';
	const saved = tryParseJsonObject(raw);

	if (!saved) {
		localStorage.setItem('toolSettings', JSON.stringify(defaultToolSettings));
		return defaultToolSettings;
	}

	const { merged, changed } = mergeWithDefaults(defaultToolSettings, saved);

	// Safety: never persist divider auto-move as enabled.
	if (merged?.toolOptions?.auto) {
		merged.toolOptions.auto = false;
	}

	if (changed) {
		localStorage.setItem('toolSettings', JSON.stringify(merged));
	}

	return merged;
};

const loadAndMigrateAppSettings = () => {
	const raw = localStorage.getItem('appSettings') || '';
	const saved = tryParseJsonObject(raw);
	const toolRaw = localStorage.getItem('toolSettings') || '';
	const savedTool = tryParseJsonObject(toolRaw);

	const legacyZoomMin = typeof savedTool?.zoomMin === 'number' ? savedTool.zoomMin : null;
	const legacyZoomMax = typeof savedTool?.zoomMax === 'number' ? savedTool.zoomMax : null;

	if (!saved) {
		const seeded = {
			...defaultAppSettings,
			...(legacyZoomMin !== null ? { zoomMin: legacyZoomMin } : null),
			...(legacyZoomMax !== null ? { zoomMax: legacyZoomMax } : null),
		};
		localStorage.setItem('appSettings', JSON.stringify(seeded));
		return seeded;
	}

	let { merged, changed } = mergeWithDefaults(defaultAppSettings, saved);

	// Migrate legacy zoom bounds from toolSettings if appSettings doesn't have them.
	if (typeof merged.zoomMin !== 'number' && legacyZoomMin !== null) {
		merged = { ...merged, zoomMin: legacyZoomMin };
		changed = true;
	}
	if (typeof merged.zoomMax !== 'number' && legacyZoomMax !== null) {
		merged = { ...merged, zoomMax: legacyZoomMax };
		changed = true;
	}
	if (changed) {
		localStorage.setItem('appSettings', JSON.stringify(merged));
	}
	return merged;
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

	// const appSettingsMemory = localStorage.getItem('appSettings') || '';

	const mainContainerElem = React.useRef(null);

	const [toolSettings, setToolSettings] = React.useState(() => loadAndMigrateToolSettings()),
		[appSettings, setAppSettings] = React.useState(() => loadAndMigrateAppSettings()),
		[playbackStatus, setPlaybackStatus] = React.useState(defaultPlaybackStatus),
		[leftMedia, setLeftMedia] = React.useState(null),
		[rightMedia, setRightMedia] = React.useState(null),
		[mainContainerSize, setMainContainerSize] = React.useState({ width: window.innerWidth, height: window.innerHeight }),
		// [pendingFileHandles, setPendingFileHandles] = React.useState(null),
		[userOS, setUserOS] = React.useState(detectUserOS),
        [currentModal, setCurrentModal] = React.useState(null),
		[leftMediaMetaData, setLeftMediaMetaData] = React.useState(null),
		[rightMediaMetaData, setRightMediaMetaData] = React.useState(null);

	// Modal props are snapshotted at open time; use refs so modal content can always read latest settings.
	const toolSettingsRef = React.useRef(toolSettings);
	const appSettingsRef = React.useRef(appSettings);
	// Update refs synchronously so any open modal reads the latest values
	// during the same render that committed state changes.
	toolSettingsRef.current = toolSettings;
	appSettingsRef.current = appSettings;

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
							fileSize: typeof arrayBuffer?.byteLength === 'number' ? arrayBuffer.byteLength : null,
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
							fileSize: typeof arrayBuffer?.byteLength === 'number' ? arrayBuffer.byteLength : null,
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

	// Save app settings to localStorage when they change
	React.useEffect(() => {
		localStorage.setItem('appSettings', JSON.stringify(appSettings));
	}, [appSettings]);

	// Safety: if app-level zoom bounds change, keep tool zoomScale in range.
	React.useEffect(() => {
		setToolSettings(prev => clampToolZoomScale(prev, appSettings));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [appSettings?.zoomMin, appSettings?.zoomMax]);

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
				appSettings={appSettings}
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
				setCurrentModal={setCurrentModal}
			/>
			<ControllerBar
				toolSettings={toolSettings}
				appSettings={appSettings}
				toolSettingsRef={toolSettingsRef}
				appSettingsRef={appSettingsRef}
				leftMedia={leftMedia}
				rightMedia={rightMedia}
				setLeftMedia={setLeftMedia}
				setRightMedia={setRightMedia}
				setToolSettings={setToolSettings}
				setAppSettings={setAppSettings}
				setCurrentModal={setCurrentModal}
				playbackStatus={playbackStatus}
				PlayerControls={PlayerControls}
				mainContainerSize={mainContainerSize}
				leftMediaMetaData={leftMediaMetaData}
				rightMediaMetaData={rightMediaMetaData}
				isInElectron={isInElectron}
				isInBrowser={isInBrowser}
			/>
            <ModalContainer currentModal={currentModal} setCurrentModal={setCurrentModal}/>
		</div>
	);
}

export default MainContainer;
