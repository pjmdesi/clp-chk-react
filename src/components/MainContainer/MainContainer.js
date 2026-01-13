import React from 'react';

import Tooltip from '../Tooltip';
import MediaContainer from '../MediaContainer';
import ControllerBar from '../ControllerBar';
// import { getFileHandle, getFileFromHandle } from '../../utils/fileHandleStore';
import { saveFileMetadata, getFileMetadata } from '../../utils/fileMetadataStore';

import { useResizeDetector } from 'react-resize-detector';
import ModalContainer from '../ModalContainer/ModalContainer';

import defaultToolSettings from '../../settings/defaultToolSettings';
import defaultAppSettings from '../../settings/defaultAppSettings';
import { clampToolZoomScale, getZoomBounds } from '../../settings/userSettingsSchema';
import keyboardControlsMap from '../../settings/keyboardControlsMap';
import UserSettingsControl from '../UserSettingsControl';

const normalizeKey = key => {
	if (typeof key !== 'string') return '';
	// Spacebar comes through as " " in modern browsers.
	if (key === ' ') return 'space';
	return key.toLowerCase();
};

const normalizeModifiers = modifiers => {
	if (!Array.isArray(modifiers)) return { ctrl: false, shift: false, alt: false, meta: false };
	const lower = modifiers.map(m => String(m).toLowerCase());
	return {
		ctrl: lower.includes('ctrl') || lower.includes('control'),
		shift: lower.includes('shift'),
		alt: lower.includes('alt') || lower.includes('option'),
		meta: lower.includes('meta') || lower.includes('cmd') || lower.includes('command'),
	};
};

const isEditableElement = elem => {
	if (!elem || typeof elem !== 'object') return false;
	const tag = (elem.tagName || '').toLowerCase();
	if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
	// contenteditable can be on the element or inherited.
	if (elem.isContentEditable) return true;
	return false;
};

const buildShortcutList = mapObj => {
	const list = [];
	if (!mapObj || typeof mapObj !== 'object') return list;

	for (const entry of Object.values(mapObj)) {
		if (!entry || typeof entry !== 'object') continue;
		if (!entry.action || typeof entry.action !== 'string') continue;
		const keys = Array.isArray(entry.keys) ? entry.keys : [];
		const keySet = new Set(keys.map(k => normalizeKey(k)));
		if (keySet.size === 0) continue;

		const mods = normalizeModifiers(entry.modifiers);
		const modCount = Number(mods.ctrl) + Number(mods.shift) + Number(mods.alt) + Number(mods.meta);
		list.push({ action: entry.action, keys: keySet, modifiers: mods, modCount });
	}

	// Prefer more-specific combos first (e.g., Shift+A before plain A)
	list.sort((a, b) => b.modCount - a.modCount);
	return list;
};

const keyboardShortcuts = buildShortcutList(keyboardControlsMap);

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

// Check if running in Electron or browser.
// Prefer runtime detection (process.versions.electron) over preload presence,
// since a missing/failed preload would incorrectly put the app into "browser mode"
// and force the File System Access API (which cannot provide real file paths).
const isElectronRuntime = !!(typeof process !== 'undefined' && process?.versions?.electron);
const hasPreloadApi = !!(typeof window !== 'undefined' && window?.api && typeof window.api.openFile === 'function');
const isInElectron = isElectronRuntime || hasPreloadApi;
const isInBrowser = !isInElectron;

const toFetchableFileUrl = maybePath => {
	if (typeof maybePath !== 'string') return null;
	const raw = maybePath.trim();
	if (!raw) return null;
	// Already a URL we can fetch.
	if (/^(app|file):\/\//i.test(raw)) return raw;

	// Windows drive path: C:\foo\bar.mp4 -> file:///C:/foo/bar.mp4
	if (/^[A-Za-z]:[\\/]/.test(raw)) {
		const normalized = raw.replace(/\\/g, '/');
		return `file:///${encodeURI(normalized)}`;
	}

	// UNC path: \\server\share\file.mp4 -> file://server/share/file.mp4
	if (/^\\\\[^\\]+\\[^\\]+/.test(raw)) {
		const withoutSlashes = raw.replace(/^\\\\/, '');
		const normalized = withoutSlashes.replace(/\\/g, '/');
		return `file://${encodeURI(normalized)}`;
	}

	// POSIX absolute path: /home/user/file.mp4 -> file:///home/user/file.mp4
	if (raw.startsWith('/')) {
		return `file://${encodeURI(raw)}`;
	}

	return null;
};

const fileUrlToPath = fileUrl => {
	if (typeof fileUrl !== 'string' || !fileUrl.startsWith('file://')) return null;
	try {
		let p = decodeURIComponent(new URL(fileUrl).pathname);
		// Windows file:// URLs include a leading slash before drive letter.
		if (/^\/[A-Za-z]:\//.test(p)) p = p.slice(1);
		return p;
	} catch {
		return null;
	}
};

const detectUserOS = (() => {
	if (typeof navigator !== 'undefined') {
		const platform = navigator.platform.toLowerCase();
		if (platform.includes('win')) return 'windows';
		if (platform.includes('mac')) return 'macos';
		if (platform.includes('linux')) return 'linux';
	}
	return 'unknown';
})();

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
		[unifiedMediaDimensions, setUnifiedMediaDimensions] = React.useState({ width: 0, height: 0, aspectRatio: 1, framerate: 0 }),
		[leftMediaMetaData, setLeftMediaMetaData] = React.useState(null),
		[rightMediaMetaData, setRightMediaMetaData] = React.useState(null);

	// Modal props are snapshotted at open time; use refs so modal content can always read latest settings.
	const toolSettingsRef = React.useRef(toolSettings);
	const appSettingsRef = React.useRef(appSettings);
	const hadLeftMediaRef = React.useRef(false);
	const hadRightMediaRef = React.useRef(false);
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

	const openSettingsModal = React.useCallback(() => {
		setCurrentModal({
			key: 'settings',
			title: 'Settings',
			component: UserSettingsControl,
			props: {
				toolSettings: toolSettingsRef.current,
				setToolSettings,
				appSettings: appSettingsRef.current,
				setAppSettings,
				toolSettingsRef,
				appSettingsRef,
			},
		});
	}, [appSettingsRef, setAppSettings, setToolSettings, toolSettingsRef]);

	const setZoomScaleClamped = React.useCallback(
		target => {
			setToolSettings(prev => {
				const next = { ...prev, zoomScale: target };
				return clampToolZoomScale(next, appSettingsRef.current);
			});
		},
		[appSettingsRef, setToolSettings]
	);

	const zoomByFactor = React.useCallback(
		factor => {
			setToolSettings(prev => {
				const { zoomMin, zoomMax } = getZoomBounds(prev, appSettingsRef.current);
				const current = typeof prev.zoomScale === 'number' ? prev.zoomScale : 1;
				const zoomPrecision = 3;
				const roundZoom = value => Number(Number(value).toFixed(zoomPrecision));
				const clamped = Math.min(zoomMax, Math.max(zoomMin, roundZoom(current * factor)));
				return { ...prev, zoomScale: clamped };
			});
		},
		[appSettingsRef, setToolSettings]
	);

	const zoomToFitOrFill = React.useCallback(
		mode => {
			const container = document.getElementById('mediaContainer');
			if (!container) return;
			const containerW = container.offsetWidth || 0;
			const containerH = container.offsetHeight || 0;
			const unifiedW = unifiedMediaDimensions?.width || 0;
			const unifiedH = unifiedMediaDimensions?.height || 0;
			if (containerW <= 0 || containerH <= 0 || unifiedW <= 0 || unifiedH <= 0) return;

			const fitRatio = Math.min(containerW / unifiedW, containerH / unifiedH);
			const fillRatio = containerW / unifiedW;
			const target = mode === 'fill' ? fillRatio : fitRatio;
			setZoomScaleClamped(target);
		},
		[setZoomScaleClamped, unifiedMediaDimensions]
	);

	const cycleDividerAutoMoveDirection = React.useCallback(() => {
		setToolSettings(prev => {
			const toolMode = prev.toolMode;
			if (toolMode !== 'divider' && toolMode !== 'horizontalDivider') return prev;
			const current = prev?.toolOptions?.type || 'backAndForth';
			const sequences = {
				divider: ['backAndForth', 'leftToRight', 'rightToLeft'],
				horizontalDivider: ['backAndForth', 'topToBottom', 'bottomToTop'],
			};
			const seq = sequences[toolMode] || ['backAndForth'];
			const idx = Math.max(0, seq.indexOf(current));
			const nextType = seq[(idx + 1) % seq.length];
			return {
				...prev,
				toolOptions: {
					...prev.toolOptions,
					type: nextType,
				},
			};
		});
	}, [setToolSettings]);

	const adjustToolSize = React.useCallback(
		delta => {
			setToolSettings(prev => {
				const toolMode = prev.toolMode;
				const current = prev?.toolOptions?.value?.[toolMode];
				if (typeof current !== 'number') return prev;

				let min = 0;
				let max = 100;
				let step = 1;
				if (toolMode === 'boxCutout' || toolMode === 'circleCutout') {
					const bounds = prev?.toolOptions?.cutoutValueBounds?.[toolMode];
					min = typeof bounds?.min === 'number' ? bounds.min : 100;
					max = typeof bounds?.max === 'number' ? bounds.max : 500;
					step = 10;
				}

				const nextVal = Math.min(max, Math.max(min, current + delta * step));
				return {
					...prev,
					toolOptions: {
						...prev.toolOptions,
						value: {
							...prev.toolOptions.value,
							[toolMode]: nextVal,
						},
					},
				};
			});
		},
		[setToolSettings]
	);

	const changePlaybackSpeed = React.useCallback(
		direction => {
			const speeds = [0.25, 0.5, 1, 2, 4, 8];
			setToolSettings(prev => {
				const current = typeof prev.playerSpeed === 'number' ? prev.playerSpeed : 1;
				let idx = speeds.indexOf(current);
				if (idx === -1) idx = speeds.indexOf(1);
				idx = Math.min(speeds.length - 1, Math.max(0, idx + direction));
				return { ...prev, playerSpeed: speeds[idx] };
			});
		},
		[setToolSettings]
	);

	const swapMedias = React.useCallback(() => {
		setLeftMedia(prevLeft => {
			setRightMedia(prevRight => prevLeft);
			return rightMedia;
		});
		setLeftMediaMetaData(prevLeft => {
			setRightMediaMetaData(prevRight => prevLeft);
			return rightMediaMetaData;
		});
	}, [rightMedia, rightMediaMetaData, setLeftMedia, setRightMedia, setLeftMediaMetaData, setRightMediaMetaData]);

	const closeMediaSide = React.useCallback(
		side => {
			if (side === 'left') {
				setLeftMedia(null);
				setLeftMediaMetaData(null);
			}
			if (side === 'right') {
				setRightMedia(null);
				setRightMediaMetaData(null);
			}
			setPlaybackStatus(prev => ({
				...prev,
				playbackState: 'paused',
				playbackPosition: 0,
				isScrubbing: false,
			}));
		},
		[setLeftMedia, setRightMedia, setLeftMediaMetaData, setRightMediaMetaData]
	);

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

	const executeKeyboardAction = React.useCallback(
		action => {
			const tool = toolSettingsRef.current;
			const app = appSettingsRef.current;
			switch (action) {
				case 'zoomIn': {
					const speed = typeof tool?.zoomSpeed === 'number' ? tool.zoomSpeed : 0.02;
					zoomByFactor(1 + Math.max(0.001, speed));
					return true;
				}
				case 'zoomOut': {
					const speed = typeof tool?.zoomSpeed === 'number' ? tool.zoomSpeed : 0.02;
					zoomByFactor(1 / (1 + Math.max(0.001, speed)));
					return true;
				}
				case 'zoomTo100':
					setZoomScaleClamped(1);
					return true;
				case 'zoomTo100Smaller': {
					const unifiedW = unifiedMediaDimensions?.width || 0;
					const leftW = leftMediaMetaData?.width || 0;
					const rightW = rightMediaMetaData?.width || 0;
					const smallerW = leftW && rightW ? Math.min(leftW, rightW) : leftW || rightW;
					if (unifiedW > 0 && smallerW > 0) {
						setZoomScaleClamped(smallerW / unifiedW);
					} else {
						setZoomScaleClamped(1);
					}
					return true;
				}
				case 'zoomToFit':
					zoomToFitOrFill('fit');
					return true;
				case 'zoomToFill':
					zoomToFitOrFill('fill');
					return true;
				case 'toggleToolLock':
					setToolSettings(prev => {
						const current = typeof prev.stick === 'boolean' ? prev.stick : !!prev?.toolOptions?.stick;
						const next = !current;
						return {
							...prev,
							stick: next,
							toolOptions: {
								...(prev.toolOptions || {}),
								stick: next,
							},
						};
					});
					return true;
				case 'toolDividerHorizontal':
					setToolSettings(prev => ({
						...prev,
						toolMode: 'horizontalDivider',
						toolOptions: { ...prev.toolOptions, auto: false },
					}));
					return true;
				case 'toolDividerVertical':
					setToolSettings(prev => ({
						...prev,
						toolMode: 'divider',
						toolOptions: { ...prev.toolOptions, auto: false },
					}));
					return true;
				case 'toolBoxCutout':
					setToolSettings(prev => ({
						...prev,
						toolMode: 'boxCutout',
						toolOptions: { ...prev.toolOptions, auto: false },
					}));
					return true;
				case 'toolCircleCutout':
					setToolSettings(prev => ({
						...prev,
						toolMode: 'circleCutout',
						toolOptions: { ...prev.toolOptions, auto: false },
					}));
					return true;
				case 'toolAutoMoveToggle':
					setToolSettings(prev => {
						if (prev.toolMode !== 'divider' && prev.toolMode !== 'horizontalDivider') return prev;
						return {
							...prev,
							toolOptions: {
								...prev.toolOptions,
								auto: !prev.toolOptions.auto,
							},
						};
					});
					return true;
				case 'toolAutoMoveDirection':
					cycleDividerAutoMoveDirection();
					return true;
				case 'toolSizeIncrease':
					adjustToolSize(1);
					return true;
				case 'toolSizeDecrease':
					adjustToolSize(-1);
					return true;
				case 'swapVideos':
					swapMedias();
					return true;
				case 'openSettingsModal':
					openSettingsModal();
					return true;
				case 'videoPlayPause':
					PlayerControls.playPause();
					return true;
				case 'videoFrameForward': {
					const fr = unifiedMediaDimensions?.framerate || 30;
					PlayerControls.skip(1 / fr);
					return true;
				}
				case 'videoFrameBackward': {
					const fr = unifiedMediaDimensions?.framerate || 30;
					PlayerControls.skip(-1 / fr);
					return true;
				}
				case 'videoFrameForwardLarge': {
					const fr = unifiedMediaDimensions?.framerate || 30;
					PlayerControls.skip(10 / fr);
					return true;
				}
				case 'videoFrameBackwardLarge': {
					const fr = unifiedMediaDimensions?.framerate || 30;
					PlayerControls.skip(-10 / fr);
					return true;
				}
				case 'videoMoveToStart':
					PlayerControls.setCurrentTime(0);
					return true;
				case 'videoMoveToEnd': {
					const fr = unifiedMediaDimensions?.framerate || 30;
					const end = typeof playbackStatus?.playbackEndTime === 'number' ? playbackStatus.playbackEndTime : 0;
					PlayerControls.setCurrentTime(Math.max(0, end - 1 / fr));
					return true;
				}
				case 'videoToggleLoop':
					setToolSettings(prev => ({ ...prev, playerLoop: !prev.playerLoop }));
					return true;
				case 'videoIncreaseSpeed':
					changePlaybackSpeed(1);
					return true;
				case 'videoDecreaseSpeed':
					changePlaybackSpeed(-1);
					return true;
				case 'toggleControllerDocking':
					setToolSettings(prev => ({
						...prev,
						controllerBarOptions: {
							...prev.controllerBarOptions,
							floating: !prev.controllerBarOptions.floating,
						},
					}));
					return true;
				case 'clearLocalSettings':
					resetStoredSettings();
					return true;
				case 'closeLeftVideo':
					closeMediaSide('left');
					return true;
				case 'closeRightVideo':
					closeMediaSide('right');
					return true;
				default:
					return false;
			}
		},
		[
			PlayerControls,
			adjustToolSize,
			appSettingsRef,
			changePlaybackSpeed,
			closeMediaSide,
			cycleDividerAutoMoveDirection,
			leftMediaMetaData,
			openSettingsModal,
			playbackStatus?.playbackEndTime,
			resetStoredSettings,
			rightMediaMetaData,
			setToolSettings,
			setZoomScaleClamped,
			swapMedias,
			toolSettingsRef,
			unifiedMediaDimensions,
			zoomByFactor,
			zoomToFitOrFill,
		]
	);

	React.useEffect(() => {
		const onKeyDown = e => {
			// Don't hijack shortcuts while typing into inputs/textareas/selects/contenteditable.
			const active = document.activeElement;
			if (isEditableElement(active)) return;
			// Also ignore when IME composition is active.
			if (e.isComposing) return;
			// Ignore if event already handled.
			if (e.defaultPrevented) return;

			const key = normalizeKey(e.key);
			if (!key) return;

			for (const shortcut of keyboardShortcuts) {
				if (!shortcut.keys.has(key)) continue;

				// Exact match for ctrl/alt/meta; shift is only required when specified.
				if (e.ctrlKey !== shortcut.modifiers.ctrl) continue;
				if (e.altKey !== shortcut.modifiers.alt) continue;
				if (e.metaKey !== shortcut.modifiers.meta) continue;
				if (shortcut.modifiers.shift && !e.shiftKey) continue;

				const handled = executeKeyboardAction(shortcut.action);
				if (handled) {
					e.preventDefault();
					e.stopPropagation();
				}
				return;
			}
		};

		window.addEventListener('keydown', onKeyDown, true);
		return () => window.removeEventListener('keydown', onKeyDown, true);
	}, [executeKeyboardAction]);

	// Restore files from saved paths in Electron
	React.useEffect(() => {
		if (!isInBrowser) {
			// Respect user setting: allow keeping the remembered paths in localStorage,
			// but don't automatically reload media into the UI.
			if (appSettingsRef.current?.reloadMediaFilesOnLaunch === false) {
				return;
			}

			const restoreElectronFiles = async () => {
				const leftPath = localStorage.getItem('leftMediaPath');
				const rightPath = localStorage.getItem('rightMediaPath');

				// Restore left media from path
				if (leftPath) {
					try {
						const fileUrl = toFetchableFileUrl(leftPath);
						if (!fileUrl) throw new Error('Invalid stored leftMediaPath');
						const fileName = leftPath.split(/[/\\]/).pop();
						const ext = leftPath.split('.').pop().toLowerCase();
						const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
						saveFileMetadata(fileUrl, {
							fileName,
							filePath: leftPath,
							mediaType: isImage ? 'image' : 'video',
							fileSize: null,
						});
						setLeftMedia(fileUrl);
					} catch (error) {
						console.error('Error restoring left media:', error);
						// Clear invalid path
						localStorage.removeItem('leftMediaPath');
					}
				}

				// Restore right media from path
				if (rightPath) {
					try {
						const fileUrl = toFetchableFileUrl(rightPath);
						if (!fileUrl) throw new Error('Invalid stored rightMediaPath');
						const fileName = rightPath.split(/[/\\]/).pop();
						const ext = rightPath.split('.').pop().toLowerCase();
						const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
						saveFileMetadata(fileUrl, {
							fileName,
							filePath: rightPath,
							mediaType: isImage ? 'image' : 'video',
							fileSize: null,
						});
						setRightMedia(fileUrl);
					} catch (error) {
						console.error('Error restoring right media:', error);
						localStorage.removeItem('rightMediaPath');
					}
				}
			};

			restoreElectronFiles();
		}
	}, [isInBrowser, appSettings?.reloadMediaFilesOnLaunch]);

	// In Electron, save left file path (not blob URL) to localStorage
	React.useEffect(() => {
		if (isInBrowser) return;

		if (leftMedia) {
			hadLeftMediaRef.current = true;
			const metadata = getFileMetadata(leftMedia);
			const derivedPath = fileUrlToPath(leftMedia);
			const pathToSave = metadata?.filePath || derivedPath;
			if (pathToSave) {
				localStorage.setItem('leftMediaPath', pathToSave);
			}
			return;
		}

		// Only clear the stored path if the user previously had media loaded
		// and then removed it. This avoids wiping persisted paths on app startup
		// before the restore effect runs.
		if (hadLeftMediaRef.current) {
			localStorage.removeItem('leftMediaPath');
		}
	}, [leftMedia, isInBrowser]);

	// In Electron, save right file path (not blob URL) to localStorage
	React.useEffect(() => {
		if (isInBrowser) return;

		if (rightMedia) {
			hadRightMediaRef.current = true;
			const metadata = getFileMetadata(rightMedia);
			const derivedPath = fileUrlToPath(rightMedia);
			const pathToSave = metadata?.filePath || derivedPath;
			if (pathToSave) {
				localStorage.setItem('rightMediaPath', pathToSave);
			}
			return;
		}

		if (hadRightMediaRef.current) {
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
			<Tooltip appSettings={appSettings} />
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
				unifiedMediaDimensions={unifiedMediaDimensions}
				setUnifiedMediaDimensions={setUnifiedMediaDimensions}
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
                defaultAppSettings={defaultAppSettings}
                defaultToolSettings={defaultToolSettings}
				toolSettings={toolSettings}
				appSettings={appSettings}
				toolSettingsRef={toolSettingsRef}
				appSettingsRef={appSettingsRef}
				unifiedMediaDimensions={unifiedMediaDimensions}
				setUnifiedMediaDimensions={setUnifiedMediaDimensions}
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
			<ModalContainer currentModal={currentModal} setCurrentModal={setCurrentModal} />
		</div>
	);
}

export default MainContainer;
