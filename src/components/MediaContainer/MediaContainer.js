import React from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

import MediaFileInput from '../MediaFileInput';
import Icon from '../Icon';
import VideoJSPlayer from '../VideoJSPlayer';
import ImagePlayer from '../ImagePlayer';
import PlayerSlider from '../PlayerSlider';
import { getFileMetadata } from '../../utils/fileMetadataStore';
import MediaInfoBar from '../MediaInfoBar';

function InfoOverlay({ info }) {
	return <div id="infoOverlayElem" dangerouslySetInnerHTML={{ __html: info }}></div>;
}

function MediaContainer({
	toolSettings,
	setToolSettings,
	playbackStatus,
	leftMedia,
	rightMedia,
	setLeftMedia,
	setRightMedia,
	PlayerControls,
	viewportSize,
	leftMediaMetaData,
	setLeftMediaMetaData,
	rightMediaMetaData,
	setRightMediaMetaData,
	resetStoredSettings,
}) {
	const mediaContainerElem = React.useRef(),
		leftMediaElem = React.useRef(),
		rightMediaElem = React.useRef(),
		videoClipper = React.useRef();

	const [clipperPosition, setClipperPosition] = React.useState({ x: 50, y: 50 }),
		[mediaOffset, setMediaOffset] = React.useState({ x: 0, y: 0 }),
		[clipperStyle, setClipperStyle] = React.useState({ width: '50%' }),
		[clipperFlip, setClipperFlip] = React.useState(false),
		[clippedMediaWrapperStyle, setClippedMediaWrapperStyle] = React.useState({ minWidth: '200%', zIndex: 3 }),
		[clippedMediaVideoStyle, setClippedMediaVideoStyle] = React.useState({ transform: 'translate(-50%, -50%)' }),
		[unClippedMediaWrapperStyle, setUnClippedMediaWrapperStyle] = React.useState({ minWidth: '100%' }),
		[unClippedMediaVideoStyle, setUnClippedMediaVideoStyle] = React.useState({ transform: 'translate(-50%, -50%)' }),
		[containerOverlayInfo, setContainerOverlayInfo] = React.useState(''),
		[zoomSnap, setZoomSnap] = React.useState(null),
		[toolModeBeforeMediaRemoval, setToolModeBeforeMediaRemoval] = React.useState('divider'),
		// continuousClipInterval = React.useRef(null),
		[validationWarnings, setValidationWarnings] = React.useState([]);

	// Determine if media are images or videos
	const leftMediaType = leftMediaMetaData?.mediaType || (leftMedia ? getFileMetadata(leftMedia)?.mediaType : null);
	const rightMediaType = rightMediaMetaData?.mediaType || (rightMedia ? getFileMetadata(rightMedia)?.mediaType : null);
	// const hasAnyVideo = leftMediaType === 'video' || rightMediaType === 'video';
	// const bothAreImages = leftMediaType === 'image' && rightMediaType === 'image';

	const isInBrowser = typeof process === 'undefined' || !process.versions || !process.versions.electron;

	// Framerate detection refs
	const leftFramerateData = React.useRef({ samples: [], lastMediaTime: 0, lastFrameNum: 0, callbackId: null });
	const rightFramerateData = React.useRef({ samples: [], lastMediaTime: 0, lastFrameNum: 0, callbackId: null });
	const timeUpdateAnimationFrame = React.useRef(null);

	const previousZoomScale = React.useRef(toolSettings.zoomScale);

	// Smooth playback position updates using requestAnimationFrame
	React.useEffect(() => {
		const hasAnyVideo = leftMediaType === 'video' || rightMediaType === 'video';

		const updatePlaybackPosition = () => {
			if (playbackStatus.playbackState === 'playing' && !playbackStatus.isScrubbing && rightMediaElem.current && rightMediaType === 'video') {
				const currentTime = rightMediaElem.current.currentTime;
				// Only update if there's a meaningful difference to avoid unnecessary renders
				if (Math.abs(currentTime - playbackStatus.playbackPosition) > 0.001) {
					PlayerControls.setCurrentTime(currentTime);
				}
			}
			timeUpdateAnimationFrame.current = requestAnimationFrame(updatePlaybackPosition);
		};

		if (playbackStatus.playbackState === 'playing' && leftMedia && rightMedia && hasAnyVideo) {
			timeUpdateAnimationFrame.current = requestAnimationFrame(updatePlaybackPosition);
		} else {
			if (timeUpdateAnimationFrame.current) {
				cancelAnimationFrame(timeUpdateAnimationFrame.current);
			}
		}

		return () => {
			if (timeUpdateAnimationFrame.current) {
				cancelAnimationFrame(timeUpdateAnimationFrame.current);
			}
		};
	}, [playbackStatus.playbackState, playbackStatus.isScrubbing, leftMedia, rightMedia, leftMediaType, rightMediaType]);

	// Plays and pauses the videos when the playback state changes (images don't have playback)
	React.useEffect(() => {
		if (leftMedia && rightMedia && leftMediaType === 'video' && rightMediaType === 'video') {
			// Always seek when scrubbing, or when paused and position is different (only for videos)
			if (playbackStatus.playbackState === 'playing') {
				if (leftMediaType === 'video') leftMediaElem.current.play();
				if (rightMediaType === 'video') rightMediaElem.current.play();
			}

			if (playbackStatus.playbackState === 'paused') {
				if (leftMediaType === 'video') leftMediaElem.current.pause();
				if (rightMediaType === 'video') rightMediaElem.current.pause();
			}
			const shouldSeek =
				playbackStatus.isScrubbing || (playbackStatus.playbackState === 'paused' && Math.abs(playbackStatus.playbackPosition - leftMediaElem.current.currentTime) > 0.01);
			if (shouldSeek) {
				// Clamp the seek time to each video's duration
				// If the seek time is beyond a video's duration, seek to its last frame
				const leftDuration = leftMediaMetaData?.duration || leftMediaElem.current.duration;
				const rightDuration = rightMediaMetaData?.duration || rightMediaElem.current.duration;

				leftMediaElem.current.currentTime = Math.min(playbackStatus.playbackPosition, leftDuration);
				rightMediaElem.current.currentTime = Math.min(playbackStatus.playbackPosition, rightDuration);
			}
		}
	}, [playbackStatus.playbackState, playbackStatus.playbackPosition, playbackStatus.isScrubbing, leftMediaType, rightMediaType, leftMediaMetaData, rightMediaMetaData]);

	//! BROKEN
	// Switches between auto and manual mode for the divider tool
	// Also reapply when media files are loaded to ensure clipper is styled correctly
	// React.useEffect(() => {
	// 	if (!leftMedia || !rightMedia) return;

	// 	clearInterval(continuousClipInterval.current);
	// 	if (toolSettings.toolMode === 'divider' && toolSettings.toolOptions.auto) {
	// 		clipMediaContinuous();
	// 	} else {
	// 		clearInterval(continuousClipInterval.current);
	// 		clipMedia();
	// 	}
	// }, [toolSettings.toolMode, toolSettings.toolOptions, leftMedia, rightMedia]);

	// Only after media files were previously loaded (don't override localStorage on initial mount)

	const previousLeftMedia = React.useRef(leftMedia);
	const previousRightMedia = React.useRef(rightMedia);

	// Check if we had media before but now one is missing (media was removed)
	// Save the current tool mode and switch to divider mode
	// When both media are present again, restore the previous tool mode
	React.useEffect(() => {
		const hadMedia = previousLeftMedia.current && previousRightMedia.current;
		const nowMissingMedia = !leftMedia || !rightMedia;
		const nowHaveMedia = leftMedia && rightMedia;

		if (hadMedia && nowMissingMedia) {
			// Save current tool mode before switching to divider (only if not already divider)
			if (toolSettings.toolMode !== 'divider') {
				setToolModeBeforeMediaRemoval(toolSettings.toolMode);
			}

			const newToolSettings = { ...toolSettings };
			newToolSettings.toolOptions.auto = false;
			newToolSettings.toolMode = 'divider';

			setToolSettings(newToolSettings);
			resetMediaClipper();
		} else if (!hadMedia && nowHaveMedia && toolModeBeforeMediaRemoval !== 'divider') {
			// Restore previous tool mode when both media are present again
			const newToolSettings = { ...toolSettings };
			newToolSettings.toolMode = toolModeBeforeMediaRemoval;
			setToolSettings(newToolSettings);
		}

		// Update refs for next render
		previousLeftMedia.current = leftMedia;
		previousRightMedia.current = rightMedia;
	}, [leftMedia, rightMedia]);

	// Updates the playback speed of the videos (images don't have playback speed)
	React.useEffect(() => {
		if (leftMediaType === 'video' || rightMediaType === 'video') {
			updateMediaPlaybackSpeed();
		}
	}, [toolSettings.playerSpeed, leftMediaType, rightMediaType]);

	// Updates the volume of the videos (images don't have audio)
	React.useEffect(() => {
		if (leftMedia && rightMedia) {
			if (leftMediaType === 'video') leftMediaElem.current.volume = toolSettings.playerAudio.left.volume;
			if (rightMediaType === 'video') rightMediaElem.current.volume = toolSettings.playerAudio.right.volume;
		}
	}, [toolSettings.playerAudio, leftMediaType, rightMediaType]);

	// Runs the clipMedia function when the zoom scale or viewport size changes
	// Scale the offset proportionally with zoom to keep container center as focal point
	React.useEffect(() => {
		if (previousZoomScale.current !== toolSettings.zoomScale) {
			const zoomRatio = toolSettings.zoomScale / previousZoomScale.current;
			const scaledOffset = {
				x: currentOffsetRef.current.x * zoomRatio,
				y: currentOffsetRef.current.y * zoomRatio,
			};
			const boundedOffset = getBoundedOffset(scaledOffset);
			currentOffsetRef.current = boundedOffset;
			setMediaOffset(boundedOffset);
			previousZoomScale.current = toolSettings.zoomScale;
			clipMedia(null, boundedOffset);
		} else {
			clipMedia();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [toolSettings.zoomScale, viewportSize]);

	// Run clipMedia when metadata loads or media changes
	React.useEffect(() => {
		if (leftMedia || rightMedia) {
			clipMedia();
		}
	}, [leftMedia, rightMedia, leftMediaMetaData, rightMediaMetaData]);

	// Update saved tool mode and run clipMedia when user changes the tool
	React.useEffect(() => {
		if (leftMedia && rightMedia) {
			setToolModeBeforeMediaRemoval(toolSettings.toolMode);
			clipMedia();
		}
	}, [toolSettings.toolMode]);

	// Display the new zoom info in the overlay info element when the media elements are resized
	React.useEffect(() => {
		const pixelPerfect = zoomSnap === 'pixel';
		let rightMediaElemWidth = 0;
		let rightMediaElemHeight = 0;

		if (rightMediaElem.current && rightMediaMetaData) {
			// Calculate displayed dimensions based on media aspect ratio and zoom
			const mediaWidth = rightMediaMetaData.width;
			const mediaHeight = rightMediaMetaData.height;
			const containerWidth = mediaContainerElem.current?.offsetWidth || 0;

			// Calculate the displayed width (accounting for zoom)
			rightMediaElemWidth = containerWidth * toolSettings.zoomScale;

			// Calculate height maintaining aspect ratio
			const aspectRatio = mediaHeight / mediaWidth;
			rightMediaElemHeight = rightMediaElemWidth * aspectRatio;
		}

		displayOverlayInfo(
			`<h3>Zoom: ${Math.round(toolSettings.zoomScale * 100)}%</h3><h6>${Math.round(rightMediaElemWidth) || 0}px <small>⨉</small> ${Math.round(rightMediaElemHeight) || 0}px ${pixelPerfect ? '[1:1]' : ''}</h6>`
		);
	}, [unClippedMediaWrapperStyle.minWidth, zoomSnap, toolSettings.zoomScale, rightMediaMetaData]);

	// When the size of the cutout changes, re-clip the media
	React.useEffect(() => {
		clipMedia();
	}, [toolSettings.toolOptions.value]);

	const getBoundedOffset = offset => {
		if (!rightMediaMetaData || !mediaContainerElem.current) return offset;

		const containerWidth = mediaContainerElem.current.offsetWidth;
		const containerHeight = mediaContainerElem.current.offsetHeight;
		const mediaWidth = rightMediaMetaData.width;
		const mediaHeight = rightMediaMetaData.height;

		const displayedWidth = containerWidth * toolSettings.zoomScale;
		const displayedHeight = (displayedWidth * mediaHeight) / mediaWidth;

		// Max offset is half the displayed media size
		// This ensures media edges can reach container center but not pass it
		const maxOffsetX = displayedWidth / 2;
		const maxOffsetY = displayedHeight / 2;

		return {
			x: Math.max(-maxOffsetX, Math.min(maxOffsetX, offset.x)),
			y: Math.max(-maxOffsetY, Math.min(maxOffsetY, offset.y)),
		};
	};

	// Framerate detection using requestVideoFrameCallback
	const detectFramerate = (videoElement, framerateDataRef, isLeft) => {
		const ticker = (now, metadata) => {
			const data = framerateDataRef.current;
			const mediaTimeDiff = Math.abs(metadata.mediaTime - data.lastMediaTime);
			const frameNumDiff = Math.abs(metadata.presentedFrames - data.lastFrameNum);
			const diff = mediaTimeDiff / frameNumDiff;

			// Collect samples when video is playing at normal speed
			if (diff && diff < 1 && data.samples.length < 50 && videoElement.playbackRate === 1) {
				data.samples.push(diff);

				// Once we have enough samples, calculate FPS and update metadata
				if (data.samples.length >= 30) {
					const avgDiff = data.samples.reduce((a, b) => a + b) / data.samples.length;
					const fps = Math.round(1 / avgDiff);

					// Update metadata with framerate
					if (isLeft) {
						setLeftMediaMetaData(prev => ({ ...prev, framerate: fps }));
					} else {
						setRightMediaMetaData(prev => ({ ...prev, framerate: fps }));
					}

					// Stop collecting samples after we have a good estimate
					if (data.samples.length >= 50) {
						return;
					}
				}
			}

			data.lastMediaTime = metadata.mediaTime;
			data.lastFrameNum = metadata.presentedFrames;

			// Continue sampling
			if (data.samples.length < 50) {
				data.callbackId = videoElement.requestVideoFrameCallback(ticker);
			}
		};

		// Start the framerate detection
		if (videoElement.requestVideoFrameCallback) {
			framerateDataRef.current.callbackId = videoElement.requestVideoFrameCallback(ticker);
		}
	};

	const handleLoadedMetadata = video => {
		let target = video.target;

		if (target.id === 'left-video' || target.id === 'left-image') {
			// Get metadata from stored file info
			const fileMetadata = getFileMetadata(leftMedia);
			const fileName = fileMetadata?.fileName || leftMedia.split(/[/\\]/).pop();
			const isImage = target.id === 'left-image';

			setLeftMediaMetaData({
				fileName: fileName,
				filePath: fileMetadata?.filePath || null,
				mediaType: fileMetadata?.mediaType || (isImage ? 'image' : 'video'),
				duration: isImage ? 0 : target.duration,
				width: isImage ? target.naturalWidth : target.videoWidth,
				height: isImage ? target.naturalHeight : target.videoHeight,
				framerate: isImage ? 0 : 30, // Default for video, will be updated by detection
			});

			// Reset and start framerate detection for left video only
			if (!isImage) {
				leftFramerateData.current = { samples: [], lastMediaTime: 0, lastFrameNum: 0, callbackId: null };
				detectFramerate(target, leftFramerateData, true);
			}
		}

		if (target.id === 'right-video' || target.id === 'right-image') {
			// Get metadata from stored file info
			const fileMetadata = getFileMetadata(rightMedia);
			const fileName = fileMetadata?.fileName || rightMedia.split(/[/\\]/).pop();
			const isImage = target.id === 'right-image';

			setRightMediaMetaData({
				fileName: fileName,
				filePath: fileMetadata?.filePath || null,
				mediaType: fileMetadata?.mediaType || (isImage ? 'image' : 'video'),
				duration: isImage ? 0 : target.duration,
				width: isImage ? target.naturalWidth : target.videoWidth,
				height: isImage ? target.naturalHeight : target.videoHeight,
				framerate: isImage ? 0 : 30, // Default for video, will be updated by detection
			});

			// Reset and start framerate detection for right video only
			if (!isImage) {
				rightFramerateData.current = { samples: [], lastMediaTime: 0, lastFrameNum: 0, callbackId: null };
				detectFramerate(target, rightFramerateData, false);
			}
		}

		const currentPlaybackEndTime = playbackStatus.playbackEndTime;

		const newPlaybackEndTime = Math.max(currentPlaybackEndTime, video.target.duration || 0);

		PlayerControls.setEndTime(newPlaybackEndTime);

		if (playbackStatus.playbackPosition > newPlaybackEndTime) {
			PlayerControls.setCurrentTime(newPlaybackEndTime);
		}
	};

	// Validate media compatibility when both metadata sets are available
	React.useEffect(() => {
		if (!leftMediaMetaData || !rightMediaMetaData) {
			setValidationWarnings([]);
			return;
		}

		const warnings = [];

		// Check 1: Mixed media types (video vs image)
		if (leftMediaMetaData.mediaType !== rightMediaMetaData.mediaType) {
			warnings.push({
				type: 'mixedMediaTypes',
				severity: 'error',
				message: `Cannot compare ${leftMediaMetaData.mediaType} with ${rightMediaMetaData.mediaType}. Please select two files of the same type.`,
			});
		}

		// Check 2: Different video durations
		if (leftMediaMetaData.mediaType === 'video' && rightMediaMetaData.mediaType === 'video') {
			const durationDiff = Math.abs(leftMediaMetaData.duration - rightMediaMetaData.duration);
			if (durationDiff > 0.1) {
				// More than 0.1 second difference
				warnings.push({
					type: 'differentDurations',
					severity: 'warning',
					message: `Videos have different durations: ${leftMediaMetaData.duration.toFixed(2)}s vs ${rightMediaMetaData.duration.toFixed(2)}s. The shorter video will display its last frame after it ends.`,
				});
			}

			// Check 3: Different framerates
			if (leftMediaMetaData.framerate && rightMediaMetaData.framerate) {
				if (leftMediaMetaData.framerate !== rightMediaMetaData.framerate) {
					const maxFramerate = Math.max(leftMediaMetaData.framerate, rightMediaMetaData.framerate);
					warnings.push({
						type: 'differentFramerates',
						severity: 'info',
						message: `Videos have different framerates: ${leftMediaMetaData.framerate}fps vs ${rightMediaMetaData.framerate}fps. Using ${maxFramerate}fps for playback controls.`,
					});
				}
			}
		}

		// Check 4: Different dimensions
		const dimensionsDiffer = leftMediaMetaData.width !== rightMediaMetaData.width || leftMediaMetaData.height !== rightMediaMetaData.height;
		if (dimensionsDiffer) {
			warnings.push({
				type: 'differentDimensions',
				severity: 'info',
				message: `Media files have different dimensions: ${leftMediaMetaData.width}×${leftMediaMetaData.height} vs ${rightMediaMetaData.width}×${rightMediaMetaData.height}. Both will be scaled to match the larger dimensions.`,
			});
		}

		setValidationWarnings(warnings);
	}, [leftMediaMetaData, rightMediaMetaData]);

	const handleTimeUpdate = e => {
		// Don't update position while user is scrubbing the slider
		if (playbackStatus.isScrubbing) return;

		PlayerControls.setCurrentTime(e.target.currentTime);
	};

	const updateMediaPlaybackSpeed = () => {
		if (leftMedia && rightMedia) {
			if (leftMediaType === 'video') leftMediaElem.current.playbackRate = toolSettings.playerSpeed;
			if (rightMediaType === 'video') rightMediaElem.current.playbackRate = toolSettings.playerSpeed;
		}
	};

	const resetMediaClipper = () => {
		setClipperStyle({ width: '50%' });
		setClippedMediaWrapperStyle({ minWidth: '200%', zIndex: 3 });
		setClippedMediaVideoStyle({ left: '50%', top: '50%', transform: 'translate(-50%, -50%) scale(1)' });
		setUnClippedMediaWrapperStyle({});
		setUnClippedMediaVideoStyle({ left: '50%', top: '50%', transform: 'translate(-50%, -50%) scale(1)' });
		setMediaOffset({ x: 0, y: 0 });

		// Reset zoom to 100%
		const newToolSettings = { ...toolSettings };
		newToolSettings.toolMode = 'divider';
		newToolSettings.zoomScale = 1;
		setToolSettings(newToolSettings);
	};

	const displayOverlayInfoTimeout = React.useRef(null);

	// Show overlay info element
	// After a timeout, hide the overlay info element again
	// Optionally cancel the timeout to prevent clearing the overlay info
	const displayOverlayInfo = (info, cancelTimeout = false) => {
		clearTimeout(displayOverlayInfoTimeout.current);

		setContainerOverlayInfo(info);

		!cancelTimeout &&
			(displayOverlayInfoTimeout.current = setTimeout(() => {
				setContainerOverlayInfo('');
			}, 750));
	};

	const clipMedia = (event, customOffset = null) => {
		// Get the container element
		const mediaContElem = mediaContainerElem.current;
		if (!mediaContElem) return;

		// Use custom offset if provided, otherwise use state offset
		const currentOffset = customOffset !== null ? customOffset : mediaOffset;

		// Calculate unified dimensions - use the larger dimensions from both media
		// This ensures both media are scaled to the same size
		let unifiedWidth = 0;
		let unifiedHeight = 0;
		let unifiedAspectRatio = 1;

		if (leftMediaMetaData && rightMediaMetaData) {
			// Use the larger dimensions to ensure both fit
			unifiedWidth = Math.max(leftMediaMetaData.width, rightMediaMetaData.width);
			unifiedHeight = Math.max(leftMediaMetaData.height, rightMediaMetaData.height);
			unifiedAspectRatio = unifiedHeight / unifiedWidth;
		} else if (leftMediaMetaData) {
			unifiedWidth = leftMediaMetaData.width;
			unifiedHeight = leftMediaMetaData.height;
			unifiedAspectRatio = unifiedHeight / unifiedWidth;
		} else if (rightMediaMetaData) {
			unifiedWidth = rightMediaMetaData.width;
			unifiedHeight = rightMediaMetaData.height;
			unifiedAspectRatio = unifiedHeight / unifiedWidth;
		}

		// Handle if either media is missing - still need to set wrapper styles for single media
		if (!(leftMedia && rightMedia)) {
			// Set wrapper styles for right media if it exists
			if (rightMedia && rightMediaMetaData && mediaContElem.offsetWidth > 0) {
				let rightWrapperStyle;

				// Use unified aspect ratio for consistent sizing
				const rightWrapperWidthPx = mediaContElem.offsetWidth * toolSettings.zoomScale;
				const rightWrapperHeightPx = rightWrapperWidthPx * unifiedAspectRatio;

				if (rightMediaType === 'image') {
					if (rightWrapperHeightPx > 0 && isFinite(rightWrapperHeightPx)) {
						rightWrapperStyle = {
							minWidth: `${100 * toolSettings.zoomScale}%`,
							maxWidth: `${100 * toolSettings.zoomScale}%`,
							height: rightWrapperHeightPx + 'px',
							minHeight: rightWrapperHeightPx + 'px',
							maxHeight: 'none',
							width: 'auto',
						};
					}
				} else {
					// Videos: use unified aspect ratio
					rightWrapperStyle = {
						minWidth: `${100 * toolSettings.zoomScale}%`,
						maxWidth: `${100 * toolSettings.zoomScale}%`,
						height: rightWrapperHeightPx + 'px',
						minHeight: rightWrapperHeightPx + 'px',
						maxHeight: 'none',
						width: 'auto',
					};
				}

				if (rightWrapperStyle) {
					setUnClippedMediaWrapperStyle(rightWrapperStyle);

					const rightMediaStyle = {
						left: '50%',
						top: '50%',
					};

					if (rightMediaType === 'video' && rightMediaMetaData) {
						// Use unified dimensions
						const rightVideoWidthPx = mediaContElem.offsetWidth * toolSettings.zoomScale;
						const rightVideoHeightPx = rightWrapperHeightPx;
						// Videos need wrapper height adjustment and explicit pixel dimensions
						rightMediaStyle.width = rightVideoWidthPx + 'px';
						rightMediaStyle.height = rightVideoHeightPx + 'px';
						rightMediaStyle.transform = `translate(calc(-50% + ${currentOffset.x}px), calc(-50% + ${currentOffset.y + rightVideoHeightPx / 2}px))`;
					} else {
						// Images don't need the wrapper height adjustment
						rightMediaStyle.transform = `translate(calc(-50% + ${currentOffset.x}px), calc(-50% + ${currentOffset.y}px))`;
					}

					setUnClippedMediaVideoStyle(rightMediaStyle);
				}
			}

			// Set wrapper styles for left media if it exists
			if (leftMedia && leftMediaMetaData) {
				let leftWrapperStyle;

				// Use unified aspect ratio for consistent sizing
				const leftWrapperWidthPx = mediaContElem.offsetWidth * toolSettings.zoomScale;
				const leftWrapperHeightPx = leftWrapperWidthPx * unifiedAspectRatio;

				if (leftMediaType === 'image') {
					leftWrapperStyle = {
						minWidth: `${100 * toolSettings.zoomScale}%`,
						maxWidth: `${100 * toolSettings.zoomScale}%`,
						height: leftWrapperHeightPx + 'px',
						minHeight: leftWrapperHeightPx + 'px',
						maxHeight: 'none',
						width: 'auto',
						zIndex: 3,
					};
				} else {
					// Videos: use unified aspect ratio
					leftWrapperStyle = {
						minWidth: `${100 * toolSettings.zoomScale}%`,
						maxWidth: `${100 * toolSettings.zoomScale}%`,
						height: leftWrapperHeightPx + 'px',
						minHeight: leftWrapperHeightPx + 'px',
						maxHeight: 'none',
						width: 'auto',
						zIndex: 3,
					};
				}

				setClippedMediaWrapperStyle(leftWrapperStyle);

				const leftMediaStyle = {
					left: '50%',
					top: '50%',
				};

				if (leftMediaType === 'video' && leftMediaMetaData) {
					// Use unified dimensions
					const leftVideoWidthPx = mediaContElem.offsetWidth * toolSettings.zoomScale;
					const leftVideoHeightPx = leftWrapperHeightPx;
					// Videos need wrapper height adjustment and explicit pixel dimensions
					leftMediaStyle.width = leftVideoWidthPx + 'px';
					leftMediaStyle.height = leftVideoHeightPx + 'px';
					leftMediaStyle.transform = `translate(calc(-50% + ${currentOffset.x}px), calc(-50% + ${currentOffset.y + leftVideoHeightPx / 2}px))`;
				} else {
					// Images don't need the wrapper height adjustment
					leftMediaStyle.transform = `translate(calc(-50% + ${currentOffset.x}px), calc(-50% + ${currentOffset.y}px))`;
				}

				setClippedMediaVideoStyle(leftMediaStyle);
			}

			return;
		}
		const containerOffset = {
			left: mediaContElem.getBoundingClientRect().left,
			top: mediaContElem.getBoundingClientRect().top,
		};

		// If no event is passed, set the container offset to 0
		if (!event) {
			containerOffset.left = 0;
			containerOffset.top = 0;
		}

		// Get the cursor position based on the event or set it to the center of the container
		let cursor = { x: event ? event.pageX : mediaContElem.offsetWidth / 2, y: event ? event.pageY : mediaContElem.offsetHeight / 2 };

		let clipperPos = {
			x: clipperPosition.x,
			y: clipperPosition.y,
		};

		// If the tool is not in stick mode and an event is passed, update the clipper position to use the event data
		if (!toolSettings.stick && event) {
			clipperPos = {
				x: ((cursor.x - containerOffset.left) / mediaContElem.offsetWidth) * 100,
				y: ((cursor.y - containerOffset.top) / mediaContElem.offsetHeight) * 100,
			};
		}

		setClipperPosition(clipperPos);

		if (toolSettings.toolMode === 'divider') {
			let position = clipperPos.x;

			if (position <= 100 && leftMediaMetaData && rightMediaMetaData && mediaContElem.offsetWidth > 0) {
				setClipperStyle({ width: position + '%' });

				// Calculate clipper offset adjustment
				// Clipper is at left:0 with width of position%
				// Its center is at (position/2)% of container
				// We want media to center at 50% of container
				const clipperCenterPercent = position / 2;
				const adjustment = (50 - clipperCenterPercent) / 100;
				const clipperOffsetAdjustment = mediaContElem.offsetWidth * adjustment;

				// Calculate wrapper dimensions - different for images vs videos
				const wrapperWidthPercent = toolSettings.zoomScale * (100 / position) * 100;

				// For images, calculate height based on aspect ratio
				// For videos, use container height (VideoJS handles aspect ratio internally)
				let leftWrapperStyle;
				if (leftMediaType === 'image') {
					// Use unified aspect ratio for consistent sizing
					const baseWidthPx = mediaContElem.offsetWidth * toolSettings.zoomScale;
					const wrapperHeightPx = baseWidthPx * unifiedAspectRatio;

					leftWrapperStyle = {
						width: wrapperWidthPercent + '%',
						minWidth: wrapperWidthPercent + '%',
						height: wrapperHeightPx + 'px',
						minHeight: wrapperHeightPx + 'px',
						maxHeight: 'none',
						maxWidth: 'none',
						zIndex: 3,
					};
				} else {
					// Videos: use unified aspect ratio
					const baseWidthPx = mediaContElem.offsetWidth * toolSettings.zoomScale;
					const wrapperHeightPx = baseWidthPx * unifiedAspectRatio;

					leftWrapperStyle = {
						width: wrapperWidthPercent + '%',
						minWidth: wrapperWidthPercent + '%',
						height: wrapperHeightPx + 'px',
						minHeight: wrapperHeightPx + 'px',
						maxHeight: 'none',
						maxWidth: 'none',
						zIndex: 3,
					};
				}

				setClippedMediaWrapperStyle(leftWrapperStyle);

				// Media: applies pan offset + clipper adjustment
				// For videos, add Y-axis centering adjustment; images don't need it
				const leftMediaStyle = {
					left: '50%',
					top: '50%',
				};

				if (leftMediaType === 'video') {
					// Use unified dimensions
					const leftBaseWidthPx = mediaContElem.offsetWidth * toolSettings.zoomScale;
					const leftVideoHeightPx = leftBaseWidthPx * unifiedAspectRatio;
					// Videos need wrapper height adjustment and explicit pixel dimensions
					leftMediaStyle.width = leftBaseWidthPx + 'px';
					leftMediaStyle.height = leftVideoHeightPx + 'px';
					leftMediaStyle.transform = `translate(calc(-50% + ${clipperOffsetAdjustment + currentOffset.x}px), calc(-50% + ${currentOffset.y}px))`;
				} else {
					// Images don't need the wrapper height adjustment
					leftMediaStyle.transform = `translate(calc(-50% + ${clipperOffsetAdjustment + currentOffset.x}px), calc(-50% + ${currentOffset.y}px))`;
				}

				setClippedMediaVideoStyle(leftMediaStyle);

				// Right media wrapper dimensions - use unified aspect ratio
				let rightWrapperStyle;
				const rightWrapperWidthPx = mediaContElem.offsetWidth * toolSettings.zoomScale;
				const rightWrapperHeightPx = rightWrapperWidthPx * unifiedAspectRatio;

				if (rightMediaType === 'image') {
					rightWrapperStyle = {
						minWidth: `${100 * toolSettings.zoomScale}%`,
						maxWidth: `${100 * toolSettings.zoomScale}%`,
						width: `${100 * toolSettings.zoomScale}%`,
						height: rightWrapperHeightPx + 'px',
						minHeight: rightWrapperHeightPx + 'px',
						maxHeight: 'none',
					};
				} else {
					// Videos: use unified aspect ratio
					rightWrapperStyle = {
						minWidth: `${100 * toolSettings.zoomScale}%`,
						maxWidth: `${100 * toolSettings.zoomScale}%`,
						width: `${100 * toolSettings.zoomScale}%`,
						height: rightWrapperHeightPx + 'px',
						minHeight: rightWrapperHeightPx + 'px',
						maxHeight: 'none',
					};
				}

				setUnClippedMediaWrapperStyle(rightWrapperStyle);

				// Right media: applies pan offset
				// For videos, also set explicit dimensions and add Y-axis centering adjustment
				const rightMediaStyle = {
					left: '50%',
					top: '50%',
				};

				if (rightMediaType === 'video') {
					// Use unified dimensions
					const rightVideoWidthPx = mediaContElem.offsetWidth * toolSettings.zoomScale;
					const rightVideoHeightPx = rightWrapperHeightPx;
					// Videos need the wrapper height adjustment for proper centering and explicit pixel dimensions
					rightMediaStyle.width = rightVideoWidthPx + 'px';
					rightMediaStyle.height = rightVideoHeightPx + 'px';
					rightMediaStyle.transform = `translate(calc(-50% + ${currentOffset.x}px), calc(-50% + ${currentOffset.y}px))`;
				} else {
					// Images don't need the wrapper height adjustment
					rightMediaStyle.transform = `translate(calc(-50% + ${currentOffset.x}px), calc(-50% + ${currentOffset.y}px))`;
				}

				setUnClippedMediaVideoStyle(rightMediaStyle);
			}
		}

		if (toolSettings.toolMode === 'circleCutout' || toolSettings.toolMode === 'boxCutout') {
			const circleSettings = {
				radius: toolSettings.toolOptions.value[toolSettings.toolMode],
			};

			if (clipperPos.x <= 100 && clipperPos.y <= 100) {
				setClipperStyle({
					width: circleSettings.radius * 2,
					height: circleSettings.radius * 2,
					left: `${clipperPos.x}%`,
					top: `${clipperPos.y}%`,
				});

				// Set the clipper to flipped if it's on the right side of the screen
				// This changes the side the lock icons shown up on
				setClipperFlip(clipperPos.x > ((mediaContElem.offsetWidth - circleSettings.radius) / mediaContElem.offsetWidth) * 100);

				const videoScale = {
					x: (1 / ((circleSettings.radius * 2) / mediaContElem.offsetWidth)) * 100 * toolSettings.zoomScale,
					y: (1 / ((circleSettings.radius * 2) / mediaContElem.offsetHeight)) * 100 * toolSettings.zoomScale,
				};

				// Calculate wrapper height adjustment based on unified aspect ratio
				const circleWrapperWidthPx = mediaContElem.offsetWidth * toolSettings.zoomScale;
				const circleWrapperHeightPx = circleWrapperWidthPx * unifiedAspectRatio;

				// Calculate clipper offset adjustment
				// Clipper is positioned with left/top % and has transform: translate(-50%, -50%)
				// So its center is at clipperPos.x%, clipperPos.y% of container
				// We need to adjust media to compensate
				const clipperCenterX = (clipperPos.x / 100) * mediaContElem.offsetWidth;
				const clipperCenterY = (clipperPos.y / 100) * mediaContElem.offsetHeight;
				const containerCenterX = mediaContElem.offsetWidth / 2;
				const containerCenterY = mediaContElem.offsetHeight / 2;
				const clipperOffsetX = containerCenterX - clipperCenterX;
				const clipperOffsetY = containerCenterY - clipperCenterY;

				// Wrapper: controls media sizing, centered in clipper

				//! This needs to be set differently for images vs videos to account for aspect ratio handling
				setClippedMediaWrapperStyle({
					minWidth: videoScale.x + '%',
					width: videoScale.x + '%',
					maxWidth: videoScale.x + '%',
					minHeight: videoScale.y + '%',
					height: videoScale.y + '%',
					maxHeight: videoScale.y + '%',
					zIndex: 3,
				});

				// Media: applies pan offset plus clipper offset
				const leftCircleMediaStyle = {
					left: '50%',
					top: '50%',
				};

				if (leftMediaType === 'video' && leftMediaMetaData) {
					// Use unified dimensions
					const circleVideoWidthPx = mediaContElem.offsetWidth * toolSettings.zoomScale;
					const circleVideoHeightPx = circleWrapperHeightPx;
					// Videos need wrapper height adjustment and explicit pixel dimensions
					leftCircleMediaStyle.width = circleVideoWidthPx + 'px';
					leftCircleMediaStyle.height = circleVideoHeightPx + 'px';
					leftCircleMediaStyle.transform = `translate(calc(-50% + ${currentOffset.x + clipperOffsetX}px), calc(-50% + ${currentOffset.y + clipperOffsetY}px))`;
				} else {
					// Images don't need the wrapper height adjustment
					leftCircleMediaStyle.transform = `translate(calc(-50% + ${currentOffset.x + clipperOffsetX}px), calc(-50% + ${currentOffset.y + clipperOffsetY}px))`;
				}

				setClippedMediaVideoStyle(leftCircleMediaStyle);
			}

			// Right media wrapper: standard full size, centered in container
			let rightCircleWrapperStyle;
			const rightCircleWrapperWidthPx = mediaContElem.offsetWidth * toolSettings.zoomScale;
			const rightCircleWrapperHeightPx = rightCircleWrapperWidthPx * unifiedAspectRatio;

			if (rightMediaType === 'image' && rightMediaMetaData) {
				rightCircleWrapperStyle = {
					minWidth: `${100 * toolSettings.zoomScale}%`,
					maxWidth: `${100 * toolSettings.zoomScale}%`,
					height: rightCircleWrapperHeightPx + 'px',
					minHeight: rightCircleWrapperHeightPx + 'px',
					maxHeight: 'none',
					width: 'auto',
				};
			} else {
				// Videos: use unified aspect ratio
				rightCircleWrapperStyle = {
					minWidth: `${100 * toolSettings.zoomScale}%`,
					maxWidth: `${100 * toolSettings.zoomScale}%`,
					height: rightCircleWrapperHeightPx + 'px',
					minHeight: rightCircleWrapperHeightPx + 'px',
					maxHeight: 'none',
					width: rightCircleWrapperWidthPx + 'px',
				};
			}

			setUnClippedMediaWrapperStyle(rightCircleWrapperStyle);

			// Right media: applies pan offset
			const rightCircleMediaStyle = {
				left: '50%',
				top: '50%',
			};

			if (rightMediaType === 'video' && rightMediaMetaData) {
				// Use unified dimensions
				const rightCircleVideoWidthPx = mediaContElem.offsetWidth * toolSettings.zoomScale;
				const rightCircleVideoHeightPx = rightCircleWrapperHeightPx;
				// Videos need wrapper height adjustment and explicit pixel dimensions
				rightCircleMediaStyle.width = rightCircleVideoWidthPx + 'px';
				rightCircleMediaStyle.height = rightCircleVideoHeightPx + 'px';
				rightCircleMediaStyle.transform = `translate(calc(-50% + ${currentOffset.x}px), calc(-50% + ${currentOffset.y}px))`;
			} else {
				// Images don't need the wrapper height adjustment
				rightCircleMediaStyle.transform = `translate(calc(-50% + ${currentOffset.x}px), calc(-50% + ${currentOffset.y}px))`;
			}

			setUnClippedMediaVideoStyle(rightCircleMediaStyle);
		}
	};

	//! BROKEN
	// const clipMediaContinuous = () => {
	// 	// Force turn off stick mode
	// 	const newToolSettings = { ...toolSettings };
	// 	newToolSettings.stick = false;

	// 	setToolSettings(newToolSettings);

	// 	let position = toolSettings.toolOptions.type === 'rightToLeft' ? 100 : 0,
	// 		positionDirection = 1,
	// 		timingSegment = 10,
	// 		mediaContElem = mediaContainerElem.current;

	// 	const positionDeltaScale = toolSettings.toolOptions.value.divider / 60;

	// 	continuousClipInterval.current = setInterval(() => {
	// 		if (toolSettings.toolOptions.type === 'rightToLeft') {
	// 			position <= 0 ? (position = 100) : (position += -1 * positionDeltaScale);
	// 		} else if (toolSettings.toolOptions.type === 'leftToRight') {
	// 			position >= 100 ? (position = 0) : (position += positionDeltaScale);
	// 		} else {
	// 			position >= 100 && (positionDirection = -1);
	// 			position <= 0 && (positionDirection = 1);
	// 			position += positionDirection * positionDeltaScale;
	// 		}

	// 		clipMedia({ pageX: (position / 100) * mediaContElem.offsetWidth, pageY: 0 });
	// 	}, timingSegment);
	// };

	const isDraggingRef = React.useRef(false);

	const handleMouseMove = e => {
		// Cancel if currently dragging (middle mouse button)
		if (isDraggingRef.current) return;
		// Cancel if the tool is set to divider and auto mode is enabled
		if (toolSettings.toolMode === 'divider' && toolSettings.toolOptions.auto) return;
		// Cancel if the tool is set to stick mode
		if (toolSettings.stick) return;

		// Send the event to the clipMedia function to update the clipper
		clipMedia(e);
	};

	const handleMediaZoom = (zoomLevel = null) => {
		if (!rightMedia || !leftMedia) return;
		const newToolSettings = { ...toolSettings };

		let animatingFrame = false;

		// Show frame anim & cancel if the zoom is out of bounds
		if (zoomLevel > 6) {
			zoomLevel = 6;
			if (!animatingFrame) {
				mediaContainerElem.current.classList.add('zoom-out-anim');
				animatingFrame = true;
				setTimeout(() => {
					mediaContainerElem.current.classList.remove('zoom-out-anim');
					animatingFrame = false;
				}, 500);
			}
		}
		if (zoomLevel < 0.5) {
			zoomLevel = 0.5;
			if (!animatingFrame) {
				mediaContainerElem.current.classList.add('zoom-in-anim');
				animatingFrame = true;
				setTimeout(() => {
					mediaContainerElem.current.classList.remove('zoom-in-anim');
					animatingFrame = false;
				}, 500);
			}
		}

		// Calculate 1:1 pixel perfect ratio
		const mediaWidth = rightMediaMetaData?.width;
		const containerWidth = mediaContainerElem.current?.offsetWidth;
		const pixelPerfectRatio = mediaWidth && containerWidth ? mediaWidth / containerWidth : null;

		if (!zoomSnap) {
			// Snap to media width if zoom is close to media width
			// For images, get the wrapper's width; for videos, get the element's width
			const mediaElemWidth = rightMediaElem.current?.parentElement?.offsetWidth || rightMediaElem.current?.offsetWidth;
			let snappedToPixelPerfect = false;

			if (pixelPerfectRatio && mediaElemWidth) {
				const pixelRatio = mediaElemWidth / mediaWidth;

				// Check if already at pixel perfect (within tight tolerance)
				if (pixelRatio < 1.02 && pixelRatio > 0.985) {
					zoomLevel = pixelPerfectRatio;
					setZoomSnap('pixel');
					snappedToPixelPerfect = true;
				} else {
					// More aggressive threshold to skip over close increments
					// Use 8% threshold to create a bigger "dead zone" around pixel perfect
					const threshold = Math.max(0.08, pixelPerfectRatio * 0.07);
					const distanceToPixelPerfect = Math.abs(zoomLevel - pixelPerfectRatio);

					// If we're within the threshold zone
					if (distanceToPixelPerfect < threshold) {
						const wasBelow = newToolSettings.zoomScale < pixelPerfectRatio;
						const isNowAbove = zoomLevel > pixelPerfectRatio;
						const wasCrossingUp = wasBelow && isNowAbove;
						const wasCrossingDown = !wasBelow && !isNowAbove;

						// Snap to pixel perfect if crossing over it
						if (wasCrossingUp || wasCrossingDown) {
							zoomLevel = pixelPerfectRatio;
							setZoomSnap('pixel');
							snappedToPixelPerfect = true;
						}
					}
				}
			}

			// Only check for snap to 1 or 2 if we didn't just snap to pixel perfect
			if (!snappedToPixelPerfect) {
				// Skip "snap to 1" (100% zoom) if:
				// 1. Pixel perfect ratio is close to 1 (within 15%)
				// 2. OR pixel perfect is in the snap to 1 range
				// 3. OR we're approaching pixel perfect (within 0.1)
				// 4. OR pixel perfect equals 1 (within tight tolerance of 0.02)
				const pixelPerfectEquals1 = pixelPerfectRatio && Math.abs(pixelPerfectRatio - 1) < 0.02;
				const pixelPerfectNear1 = pixelPerfectRatio && Math.abs(pixelPerfectRatio - 1) < 0.15;
				const pixelPerfectInSnap1Range = pixelPerfectRatio && pixelPerfectRatio < 1.04 && pixelPerfectRatio > 0.96;
				const approachingPixelPerfect = pixelPerfectRatio && Math.abs(zoomLevel - pixelPerfectRatio) < 0.1;

				if (!pixelPerfectEquals1 && !pixelPerfectNear1 && !pixelPerfectInSnap1Range && !approachingPixelPerfect && zoomLevel < 1.04 && zoomLevel > 0.96) {
					zoomLevel = 1;
					setZoomSnap('1');
				}

				// Skip "snap to 2" (200% zoom) if pixel perfect ratio is close to 2 (within 15%)
				const pixelPerfectNear2 = pixelPerfectRatio && Math.abs(pixelPerfectRatio - 2) < 0.15;
				const pixelPerfectInSnap2Range = pixelPerfectRatio && pixelPerfectRatio < 2.04 && pixelPerfectRatio > 1.96;
				const approachingPixelPerfect2 = pixelPerfectRatio && Math.abs(zoomLevel - pixelPerfectRatio) < 0.2;

				if (!pixelPerfectNear2 && !pixelPerfectInSnap2Range && !approachingPixelPerfect2 && zoomLevel < 2.04 && zoomLevel > 1.96) {
					zoomLevel = 2;
					setZoomSnap('2');
				}
			}
		} else {
			setZoomSnap(null);
		}

		newToolSettings.zoomScale = zoomLevel;

		setToolSettings(newToolSettings);
	};

	const handleScroll = e => {
		if (!rightMedia || !leftMedia) return;

		// swap scroll directions if tool setting is enabled
		if (toolSettings.swapScrollDirections) {
			[e.deltaX, e.deltaY] = [e.deltaY, e.deltaX];
		}

		// zoom videos if primary scroll
		if (e.deltaY !== 0 && e.deltaX === 0) {
			const newToolSettings = { ...toolSettings };
			// Calculate the new zoom scale based on the scroll value
			// To make it 'feel' like it's zooming in and out at an even rate, multiply the scroll value delta by the current zoom scale. i.e. the more zoomed in, the faster it zooms in and out
			let newZoom = newToolSettings.zoomScale + (e.deltaY * newToolSettings.zoomScale) / 2500;

			newZoom = Number(Number(newZoom).toFixed(2));

			handleMediaZoom(newZoom);
		} else if (e.deltaY === 0 && e.deltaX !== 0) {
			// seek frames if secondary scroll (with threshold to avoid accidental triggers)
			seekFrames(e.deltaX < 0 ? 0.5 : -0.5);
		}

		clipMedia(e);
	};

	const offsetStartRef = React.useRef({ x: 0, y: 0 });
	const startingOffsetRef = React.useRef({ x: 0, y: 0 });
	const currentOffsetRef = React.useRef({ x: 0, y: 0 });

	const handleMiddleDrag = event => {
		event.preventDefault();

		const dragDelta = {
			x: event.clientX - offsetStartRef.current.x,
			y: event.clientY - offsetStartRef.current.y,
		};

		const newOffset = {
			x: startingOffsetRef.current.x + dragDelta.x,
			y: startingOffsetRef.current.y + dragDelta.y,
		};

		// Constrain offset to prevent excessive panning
		const boundedOffset = getBoundedOffset(newOffset);

		// Update ref immediately (synchronous)
		currentOffsetRef.current = boundedOffset;
		// Update state for re-render
		setMediaOffset(boundedOffset);
		clipMedia(null, boundedOffset);
	};

	// For right mouse drag to resize clipper
	// Store starting size and mouse position in refs
	const startingSizeRef = React.useRef({ size: 0 });
	const startingPositionRef = React.useRef({ x: 0, y: 0 });
	const currentPositionRef = React.useRef({ x: 0, y: 0 });
	const currentSizeRef = React.useRef({ size: 0 });
	const cutoutMinSize = React.useRef(100);
	const cutoutMaxSize = React.useRef(500);

	const handleRightDrag = event => {
		event.preventDefault();

		const dragDelta = {
			x: event.clientX - startingPositionRef.current.x,
			y: event.clientY - startingPositionRef.current.y,
		};

		let newSize = Math.sqrt(Math.pow(currentPositionRef.current.x + dragDelta.x, 2) + Math.pow(currentPositionRef.current.y + dragDelta.y, 2));

		// Enforce minimum size
		if (newSize < cutoutMinSize.current) newSize = cutoutMinSize.current;

		if (newSize > cutoutMaxSize.current) newSize = cutoutMaxSize.current;

		currentSizeRef.current.size = newSize;

		const newToolSettings = { ...toolSettings };
		newToolSettings.toolOptions.value[toolSettings.toolMode] = newSize;
		// // Update state for re-render
		setToolSettings(newToolSettings);
		clipMedia();
	};

	const handleMouseUp = event => {
		event.preventDefault();
		isDraggingRef.current = false;
		mediaContainerElem.current.removeEventListener('mousemove', handleMiddleDrag);
		mediaContainerElem.current.removeEventListener('mousemove', handleRightDrag);
		mediaContainerElem.current.removeEventListener('mouseup', handleMouseUp);
	};

	const lastMiddleClickTimeRef = React.useRef(0);

	// Controls mouse down events for panning (middle mouse) and clipper resizing (right mouse)
	const handleMouseDown = event => {
		if (!leftMedia || !rightMedia) return;

		if (event.button === 1) {
			event.preventDefault();

			// Check for double-click (within 300ms)
			const now = Date.now();
			const timeSinceLastClick = now - lastMiddleClickTimeRef.current;

			if (timeSinceLastClick < 300) {
				// Double-click detected - reset zoom and offset
				const newToolSettings = { ...toolSettings, zoomScale: 1 };
				setToolSettings(newToolSettings);

				currentOffsetRef.current = { x: 0, y: 0 };
				setMediaOffset({ x: 0, y: 0 });

				lastMiddleClickTimeRef.current = 0;
				return;
			}

			lastMiddleClickTimeRef.current = now;

			isDraggingRef.current = true;

			offsetStartRef.current = {
				x: event.clientX,
				y: event.clientY,
			};

			// Use ref instead of state to get the current value synchronously
			startingOffsetRef.current = { ...currentOffsetRef.current };

			mediaContainerElem.current.addEventListener('mousemove', handleMiddleDrag, false);
			mediaContainerElem.current.addEventListener('mouseup', handleMouseUp, false);

			return;
		}

		if (event.button === 2) {
			// prevent default context menu
			event.preventDefault();

			// As user drags while holding right mouse button, change size of clipper, if applicable
			if (toolSettings.toolMode === 'circleCutout' || toolSettings.toolMode === 'boxCutout') {
				isDraggingRef.current = true;

				startingPositionRef.current = {
					x: event.clientX,
					y: event.clientY,
				};

				cutoutMinSize.current = toolSettings.toolOptions.cutoutValueBounds[toolSettings.toolMode].min;
				cutoutMaxSize.current = toolSettings.toolOptions.cutoutValueBounds[toolSettings.toolMode].max;

				startingSizeRef.current = { ...currentSizeRef.current };

				mediaContainerElem.current.addEventListener('mousemove', handleRightDrag, false);
				mediaContainerElem.current.addEventListener('mouseup', handleMouseUp, false);

				return;
			}

			return;
		}
	};

	// Toggle clipper lock on click
	// Prevents the clipper from moving when the mouse moves
	const toggleClipperLock = e => {
		if (e.target.id !== 'mediaContainer' && e.target.parentElement.id !== 'mediaContainer' && e.target.parentElement.id !== 'videoClipper') return;
		if (!leftMedia || !rightMedia) return;
		if (toolSettings.toolMode === 'divider' && toolSettings.toolOptions.auto) return;
		setToolSettings({ ...toolSettings, stick: !toolSettings.stick });
	};

	// Keyboard controls
	// Needs a lot of additions:
	// - Frame stepping
	// - Zoom in/out
	// - Tool mode switching
	// - Tool option adjustments
	//   • Cutout size
	//   • Divider auto on/off (when fixed)
	//   • Divider auto speed (when fixed)
	// - (?) Panning controls
	// - (?) Clipper position controls
	// - (?) Clipper lock toggle
	// - (?) Reset zoom/offset
	window.onkeyup = function (keyEvent) {
		if (keyEvent.code === 'Space') {
			PlayerControls.playPause();
		}
		if (keyEvent.code === 'ArrowLeft') {
			PlayerControls.skip(-0.1);
		}
		if (keyEvent.code === 'ArrowRight') {
			PlayerControls.skip(0.1);
		}

		// Shortcut: ctrl+alt+c to clear saved settings
		if (keyEvent.code === 'KeyC' && keyEvent.ctrlKey && keyEvent.altKey) {
			resetStoredSettings();
		}
	};

	const getCurrentFrame = media => {
		return media.currentTime;
	};

	const getNewPosition = (media, nrOfFrames) => {
		return getCurrentFrame(media) + nrOfFrames; //+ 0.00001
	};

	// see: http://www.inconduit.com/smpte/
	const seekFrames = frameCount => {
		// Only seek on videos, not images
		if (leftMediaType !== 'video' || rightMediaType !== 'video') return;

		playbackStatus.playbackState !== 'paused' && PlayerControls.pause();
		setNewPosition(frameCount);
	};

	const setNewPosition = frameCount => {
		// Only set position on videos, not images
		if (leftMediaType !== 'video' || rightMediaType !== 'video') return;

		let newPosLeft = getNewPosition(leftMediaElem.current, frameCount),
			newPosRight = getNewPosition(rightMediaElem.current, frameCount);

		// use the most recent frame as the one to sync to
		if (newPosLeft > newPosRight) {
			leftMediaElem.current.currentTime = newPosLeft;
			rightMediaElem.current.currentTime = newPosLeft;
		} else {
			// the right media is at the latest frame OR they're equal and it doesn't matter
			leftMediaElem.current.currentTime = newPosRight;
			rightMediaElem.current.currentTime = newPosRight;
		}
	};

	return (
		<div
			id="mediaContainer"
			ref={mediaContainerElem}
			onMouseMove={handleMouseMove}
			className={rightMedia ? '' : 'empty'}
			onClick={toggleClipperLock}
			onMouseDown={handleMouseDown}
			onWheel={handleScroll}>
			<InfoOverlay info={containerOverlayInfo} />
			{validationWarnings.length > 0 && (
				<div id="validationWarnings" className={`validation-warnings ${validationWarnings.some(w => w.severity === 'error') ? 'has-error' : ''}`}>
					{validationWarnings.map((warning, index) => (
						<div key={index} className={`validation-warning ${warning.severity}`}>
							<Icon name={warning.severity === 'error' ? 'AlertCircle' : warning.severity === 'warning' ? 'AlertTriangle' : 'Info'} size={16} />
							<span>{warning.message}</span>
						</div>
					))}
				</div>
			)}
			{leftMedia ? (
				<MediaInfoBar
					mediaSide="left"
					mediaSource={leftMedia}
					mediaType={leftMediaType}
					mediaMetaData={leftMediaMetaData}
					isInBrowser={isInBrowser}
					toolSettings={toolSettings}
					setToolSettings={setToolSettings}
					setMediaSource={setLeftMedia}
					setContainerOverlayInfo={setContainerOverlayInfo}
				/>
			) : (
				<MediaFileInput setMediaFile={setLeftMedia} mediaKey="leftMediaHandle" oppositeMediaMetaData={rightMediaMetaData} />
			)}
			{rightMedia ? (
				<>
					<MediaInfoBar
						mediaSide="right"
						mediaSource={rightMedia}
						mediaType={rightMediaType}
						mediaMetaData={rightMediaMetaData}
						isInBrowser={isInBrowser}
						toolSettings={toolSettings}
						setToolSettings={setToolSettings}
						setMediaSource={setRightMedia}
						setContainerOverlayInfo={setContainerOverlayInfo}
					/>
					{rightMediaType === 'video' ? (
						<VideoJSPlayer
							videoRef={rightMediaElem}
							id="right-video"
							onTimeUpdate={handleTimeUpdate}
							onLoadedMetadata={handleLoadedMetadata}
							src={rightMedia || ''}
							loop={toolSettings.playerLoop}
							onEnded={() => PlayerControls.pause()}
							muted={toolSettings.playerAudio.right.muted}
							volume={toolSettings.playerAudio.right.volume}
							playbackRate={toolSettings.playerSpeed}
							style={unClippedMediaWrapperStyle}
							videoStyle={unClippedMediaVideoStyle}
						/>
					) : (
						<ImagePlayer
							imageRef={rightMediaElem}
							id="right-image"
							onLoad={handleLoadedMetadata}
							src={rightMedia || ''}
							style={unClippedMediaWrapperStyle}
							imageStyle={unClippedMediaVideoStyle}
						/>
					)}
				</>
			) : (
				<MediaFileInput setMediaFile={setRightMedia} mediaKey="rightMediaHandle" oppositeMediaMetaData={leftMediaMetaData} />
			)}
			<div
				id="videoClipper"
				ref={videoClipper}
				style={clipperStyle}
				className={`${toolSettings.toolMode}${leftMedia ? '' : ' empty'}${toolSettings.stick ? ' stuck' : ''}${
					toolSettings.toolMode === 'divider' && toolSettings.toolOptions.auto ? ' auto' : ''
				}${clipperFlip ? ' flipped' : ''}`}>
				{leftMedia &&
					(leftMediaType === 'video' ? (
						<VideoJSPlayer
							videoRef={leftMediaElem}
							id="left-video"
							style={clippedMediaWrapperStyle}
							videoStyle={clippedMediaVideoStyle}
							onLoadedMetadata={handleLoadedMetadata}
							src={leftMedia || ''}
							loop={toolSettings.playerLoop}
							onEnded={() => PlayerControls.pause()}
							muted={toolSettings.playerAudio.left.muted}
							volume={toolSettings.playerAudio.left.volume}
							playbackRate={toolSettings.playerSpeed}
						/>
					) : (
						<ImagePlayer
							imageRef={leftMediaElem}
							id="left-image"
							onLoad={handleLoadedMetadata}
							src={leftMedia || ''}
							style={clippedMediaWrapperStyle}
							imageStyle={clippedMediaVideoStyle}
						/>
					))}
			</div>
			{leftMedia && rightMedia && (
				<PlayerSlider
					defaultSliderValue={100}
					id="zoomLevelSlider"
					name="Zoom Level"
					sliderMinMax={[50, 600]}
					value={toolSettings.zoomScale * 100}
					stepValue={2}
					direction="vertical"
					onChange={value => handleMediaZoom(0.5 * Math.pow(12, (value - 50) / 550))}
					// valueFormatter={value => Math.round(0.5 * Math.pow(12, (value - 50) / 550) * 100)}
					option={toolSettings.zoomScale}
					label="%"
					style={{
						marginBottom: toolSettings.controllerBarOptions.floating ? '96px' : '0',
						transitionDelay: toolSettings.controllerBarOptions.floating ? '0s' : '0.5s',
					}}
				/>
			)}
		</div>
	);
}

export default MediaContainer;
