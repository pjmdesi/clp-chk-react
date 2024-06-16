import React from 'react';

import MediaFileInput from '../MediaFileInput';
import Icon from '../Icon';
import MainContainer from '../MainContainer/MainContainer';

function MediaContainer({ toolSettings, setToolSettings, playbackStatus, leftMedia, rightMedia, setLeftMedia, setRightMedia, PlayerControls }) {
	const mediaContainerElem = React.useRef(),
		leftMediaElem = React.useRef(),
		rightMediaElem = React.useRef(),
		videoClipper = React.useRef();

	const [leftMediaLabel, setLeftMediaLabel] = React.useState('Left Media'),
		[rightMediaLabel, setRightMediaLabel] = React.useState('Right Media'),
		[clipperPosition, setClipperPosition] = React.useState({ x: 50, y: 50 }),
		[videoOffset, setVideoOffset] = React.useState({ x: 0, y: 0 }),
		[clipperStyle, setClipperStyle] = React.useState({ width: '50%' }),
		[clipperFlip, setClipperFlip] = React.useState(false),
		[clippedMediaStyle, setClippedMediaStyle] = React.useState({ minWidth: '200%', zIndex: 3 }),
		[unClippedMediaStyle, setUnClippedMediaStyle] = React.useState({ minWidth: '100%' }),
		[mainContainerOverlayInfo, setMainContainerOverlayInfo] = React.useState(''),
		continuousClipInterval = React.useRef(null);

	React.useEffect(() => {
		if (leftMedia && rightMedia) {
			if (playbackStatus.playbackState === 'playing') {
				leftMediaElem.current.play();
				rightMediaElem.current.play();
			}

			if (playbackStatus.playbackState === 'paused') {
				leftMediaElem.current.pause();
				rightMediaElem.current.pause();

				if (playbackStatus.playbackPosition !== leftMediaElem.current.currentTime) {
					leftMediaElem.current.currentTime = playbackStatus.playbackPosition;
					rightMediaElem.current.currentTime = playbackStatus.playbackPosition;
				}
			}
		}
	}, [playbackStatus, leftMedia, rightMedia]);

	React.useEffect(() => {
		clearInterval(continuousClipInterval.current);
		if (toolSettings.toolMode === 'divider' && toolSettings.toolOptions.auto) {
			clipMediaContinuous();
		} else {
			clearInterval(continuousClipInterval.current);
			clipMedia();
		}
	}, [toolSettings.toolMode, toolSettings.toolOptions]);

	React.useEffect(() => {
		const newToolSettings = { ...toolSettings };

		let leftMediaDuration = 0,
			rightMediaDuration = 0;

		if (!leftMedia || !rightMedia) {
			newToolSettings.toolOptions.auto = false;
			newToolSettings.toolMode = 'divider';

			setToolSettings(newToolSettings);

			resetMediaClipper();
		}

		if (leftMedia) {
			setLeftMediaLabel(leftMedia.split(/[/\\]/).pop());
			leftMediaElem.current.load();

			leftMediaDuration = leftMediaElem.current.duration;
		} else {
			setLeftMediaLabel('');
		}
		if (rightMedia) {
			setRightMediaLabel(rightMedia.split(/[/\\]/).pop());
			rightMediaElem.current.load();

			rightMediaDuration = rightMediaElem.current.duration;
		} else {
			setRightMediaLabel('');
		}
	}, [leftMedia, rightMedia]);

	React.useEffect(() => {
		updateMediaPlaybackSpeed();
	}, [toolSettings.playerSpeed]);

	React.useEffect(() => {
		if (leftMedia && rightMedia) {
			leftMediaElem.current.volume = toolSettings.playerAudio.left.volume;
			rightMediaElem.current.volume = toolSettings.playerAudio.right.volume;
		}
	}, [toolSettings.playerAudio]);

	React.useEffect(() => {
		clipMedia();
	}, [toolSettings.zoomScale]);

    let offsetStart = videoOffset;

	const handleLoadedMetadata = video => {
		const currentPlaybackEndTime = playbackStatus.playbackEndTime;

		const newPlaybackEndTime = Math.max(currentPlaybackEndTime, video.target.duration);

		PlayerControls.setEndTime(newPlaybackEndTime);

		if (playbackStatus.playbackPosition > newPlaybackEndTime) {
			PlayerControls.setCurrentTime(newPlaybackEndTime);
		}
	};

	const handleTimeUpdate = e => {
		PlayerControls.setCurrentTime(e.target.currentTime);
	};

	const updateMediaPlaybackSpeed = () => {
		if (leftMedia && rightMedia) {
			leftMediaElem.current.playbackRate = toolSettings.playerSpeed;
			rightMediaElem.current.playbackRate = toolSettings.playerSpeed;
		}
	};

	const openMediaFile = mediaFile => {
		mediaFile = mediaFile.replace(/\\+/g, '/');
		window.api.openFile(mediaFile);
	};

	const resetMediaClipper = () => {
		setClipperStyle({ width: '50%' });
		setClippedMediaStyle({ minWidth: '200%', zIndex: 3 });
	};

	const displayOverlayInfoTimeout = React.useRef(null);

	const displayOverlayInfo = info => {
		clearTimeout(displayOverlayInfoTimeout.current);

		setMainContainerOverlayInfo(info);

		displayOverlayInfoTimeout.current = setTimeout(() => {
			setMainContainerOverlayInfo('');
		}, 750);
	};

	const clipMedia = event => {
		// console.log({ event });
		// Don't clip if either side is empty
		if (!(leftMedia && rightMedia)) return;

		// Get the container element and its offset
		const mediaContElem = mediaContainerElem.current;
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

			if (position <= 100) {
				setClipperStyle({ width: position + '%' });

				setClippedMediaStyle({
					width: toolSettings.zoomScale * (100 / position) * 100 + '%',
					minWidth: toolSettings.zoomScale * (100 / position) * 100 + '%',
					zIndex: 3,
                    top: (videoOffset.y * toolSettings.zoomScale)  + mediaContElem.offsetHeight / 2,
					left: (videoOffset.x * toolSettings.zoomScale) + mediaContElem.offsetWidth / 2,
				});
				setUnClippedMediaStyle({
					minWidth: `${100 * toolSettings.zoomScale}%`,
					maxWidth: `${100 * toolSettings.zoomScale}%`,
					left: `calc( 50% + ${videoOffset.x * toolSettings.zoomScale}px)`,
					top: `calc( 50% + ${videoOffset.y * toolSettings.zoomScale}px)`,
				});
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

				const clippedMediaStyle = {
					minWidth: videoScale.x + '%',
					width: videoScale.x + '%',
					minHeight: videoScale.y + '%',
					height: videoScale.y + '%',
					left: (videoOffset.x * toolSettings.zoomScale) + circleSettings.radius - (clipperPos.x / 100) * mediaContElem.offsetWidth + mediaContElem.offsetWidth / 2,
					top: (videoOffset.y * toolSettings.zoomScale) + circleSettings.radius - (clipperPos.y / 100) * mediaContElem.offsetHeight + mediaContElem.offsetHeight / 2,
				};

				setClippedMediaStyle(clippedMediaStyle);
			}

			setUnClippedMediaStyle({
				minWidth: `${100 * toolSettings.zoomScale}%`,
				minHeight: `${100 * toolSettings.zoomScale}%`,
				maxWidth: `${100 * toolSettings.zoomScale}%`,
				maxHeight: `${100 * toolSettings.zoomScale}%`,
				left: `calc( 50% + ${videoOffset.x * toolSettings.zoomScale}px)`,
				top: `calc( 50% + ${videoOffset.y * toolSettings.zoomScale}px)`,
			});
		}
	};

	const clipMediaContinuous = () => {
		// Force turn off stick mode
		const newToolSettings = { ...toolSettings };
		newToolSettings.stick = false;

		setToolSettings(newToolSettings);

		let position = toolSettings.toolOptions.type === 'rightToLeft' ? 100 : 0,
			positionDirection = 1,
			timingSegment = 10,
			mediaContElem = mediaContainerElem.current;

		const positionDeltaScale = toolSettings.toolOptions.value.divider / 60;

		continuousClipInterval.current = setInterval(() => {
			if (toolSettings.toolOptions.type === 'rightToLeft') {
				position <= 0 ? (position = 100) : (position += -1 * positionDeltaScale);
			} else if (toolSettings.toolOptions.type === 'leftToRight') {
				position >= 100 ? (position = 0) : (position += positionDeltaScale);
			} else {
				position >= 100 && (positionDirection = -1);
				position <= 0 && (positionDirection = 1);
				position += positionDirection * positionDeltaScale;
			}

			clipMedia({ pageX: (position / 100) * mediaContElem.offsetWidth, pageY: 0 });
		}, timingSegment);
	};

	const handleMouseMove = e => {
		// Cancel if the tool is set to divider and auto mode is enabled
		if (toolSettings.toolMode === 'divider' && toolSettings.toolOptions.auto) return;
		// Cancel if the tool is set to stick mode
		if (toolSettings.stick) return;

		// Send the event to the clipMedia function to update the clipper
		clipMedia(e);
	};

	const handleScroll = e => {
		// console.log(e);

		// swap scroll directions if tool setting is enabled
		if (toolSettings.swapScrollDirections) {
			[e.deltaX, e.deltaY] = [e.deltaY, e.deltaX];
		}

		// zoom videos if primary scroll
		if (e.deltaY !== 0 && e.deltaX === 0) {
			const newToolSettings = { ...toolSettings };

			// Calculate the new zoom scale based on the scroll value
			// To make it 'feel' like it's zooming in and out at an even rate, multiply the scroll value delta by the current zoom scale. i.e. the more zoomed in, the faster it zooms in and out
			let newZoom = newToolSettings.zoomScale + (e.deltaY * newToolSettings.zoomScale) / 5000;

			newZoom = Number(Number(newZoom).toFixed(3));

			let animating = false;

			// Show anim & cancel if the zoom is out of bounds
			if (newZoom > 6) {
				newZoom = 6;
				if (!animating) {
					mediaContainerElem.current.classList.add('zoom-out-anim');
					animating = true;
					setTimeout(() => {
						mediaContainerElem.current.classList.remove('zoom-out-anim');
						animating = false;
					}, 500);
				}
			}
			if (newZoom < 0.5) {
				newZoom = 0.5;
				if (!animating) {
					mediaContainerElem.current.classList.add('zoom-in-anim');
					animating = true;
					setTimeout(() => {
						mediaContainerElem.current.classList.remove('zoom-in-anim');
						animating = false;
					}, 500);
				}
			}

			newToolSettings.zoomScale = newZoom;

			displayOverlayInfo(`Zoom: ${Math.round(newZoom * 100)}%`);

			setToolSettings(newToolSettings);
		}

		clipMedia(e);
	};

	const handleDrag = (event) => {
		event.preventDefault();

        const offsetDelta = {
            x: (offsetStart.x - event.clientX) / toolSettings.zoomScale,
            y: (offsetStart.y - event.clientY) / toolSettings.zoomScale,
        }

        console.log({ offsetDelta });

        const newOffset = {
            x: videoOffset.x - offsetDelta.x,
            y: videoOffset.y - offsetDelta.y,
        };

        if (newOffset.x > mediaContainerElem.current.offsetWidth / 2) {
            newOffset.x = mediaContainerElem.current.offsetWidth / 2;
        }

        if (newOffset.x < -mediaContainerElem.current.offsetWidth / 2) {
            newOffset.x = -mediaContainerElem.current.offsetWidth / 2;
        }

        if (newOffset.y > mediaContainerElem.current.offsetHeight / 2) {
            newOffset.y = mediaContainerElem.current.offsetHeight / 2;
        }

        if (newOffset.y < -mediaContainerElem.current.offsetHeight / 2) {
            newOffset.y = -mediaContainerElem.current.offsetHeight / 2;
        }

        setVideoOffset(newOffset);
	};

    const handleMouseUp = () => {
        mediaContainerElem.current.removeEventListener('mousemove', handleDrag);
        mediaContainerElem.current.removeEventListener('mouseup', handleMouseUp);
    };

	const handleMouseDown = event => {
		if (!leftMedia || !rightMedia) return;

		if (event.button === 1) {
			event.preventDefault();

            offsetStart = {
                x: event.clientX,
                y: event.clientY,
            };

			mediaContainerElem.current.addEventListener('mousemove', handleDrag, false);
			// mediaContainerElem.current.addEventListener('mousemove', handleDrag(event, offsetStart));
			mediaContainerElem.current.addEventListener('mouseup', handleMouseUp, false);

			return;
		}

		if (event.button === 2) {
			event.preventDefault();
			return;
		}
	};

	const handleClick = event => {
		toggleClipperLock(event);
	};

	const toggleClipperLock = e => {
		console.log({ e });
		if (e.target.id !== 'mediaContainer' && e.target.parentElement.id !== 'mediaContainer' && e.target.parentElement.id !== 'videoClipper') return;
		if (!leftMedia || !rightMedia) return;
		if (toolSettings.toolMode === 'divider' && toolSettings.toolOptions.auto) return;
		setToolSettings({ ...toolSettings, stick: !toolSettings.stick });
	};

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
	};

	const getCurrentFrame = video => {
		return video.currentTime;
	};

	const getNewPosition = (video, nrOfFrames) => {
		return getCurrentFrame(video) + nrOfFrames; //+ 0.00001
	};

	// see: http://www.inconduit.com/smpte/
	const seekFrames = frameCount => {
		!leftMediaElem.current.paused && PlayerControls.playPause();
		!rightMediaElem.current.paused && PlayerControls.playPause();
		setNewPosition(frameCount);
	};

	const setNewPosition = frameCount => {
		let newPosLeft = getNewPosition(leftMediaElem.current, frameCount),
			newPosRight = getNewPosition(rightMediaElem.current, frameCount);

		// use the most recent frame as the one to sync to
		if (newPosLeft > newPosRight) {
			leftMediaElem.current.currentTime = newPosLeft;
			rightMediaElem.current.currentTime = newPosLeft;
		} else {
			// the right video is at the latest frame OR they're equal and it doesn't matter
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
			onClick={handleClick}
			onMouseDown={handleMouseDown}
			onWheel={handleScroll}
			data-overlay-info={mainContainerOverlayInfo}>
			{leftMedia ? (
				<div className="video-info left-video-info">
					<button className="video-closer" type="button" onClick={() => setLeftMedia('')}>
						<Icon name="X" />
					</button>
					<p className="video-label" onClick={() => openMediaFile(leftMedia)}>
						{leftMediaLabel}
					</p>
					<button
						className="video-audio-mute"
						type="button"
						onClick={() => {
							const newToolSettings = { ...toolSettings };
							newToolSettings.playerAudio.left.muted = !newToolSettings.playerAudio.left.muted;
							setToolSettings(newToolSettings);
						}}>
						<Icon name={toolSettings.playerAudio.left.muted ? 'VolumeX' : 'Volume2'} color={toolSettings.playerAudio.left.muted ? 'yellow' : 'white'} />
					</button>
					<button className="video-meta-data" type="button">
						<Icon name="Info" />
					</button>
				</div>
			) : (
				<MediaFileInput setMediaFile={setLeftMedia} />
			)}
			{rightMedia ? (
				<>
					<div className="video-info right-video-info">
						<button className="video-meta-data" type="button">
							<Icon name="Info" />
						</button>
						<button
							className="video-audio-mute"
							type="button"
							onClick={() => {
								const newToolSettings = { ...toolSettings };
								newToolSettings.playerAudio.right.muted = !newToolSettings.playerAudio.right.muted;

								setToolSettings(newToolSettings);
							}}>
							<Icon name={toolSettings.playerAudio.right.muted ? 'VolumeX' : 'Volume2'} color={toolSettings.playerAudio.right.muted ? 'yellow' : 'white'} />
						</button>
						<p className="video-label" onClick={() => openMediaFile(rightMedia)}>
							{rightMediaLabel}
						</p>
						<button className="video-closer" type="button" onClick={() => setRightMedia('')}>
							<Icon name="X" />
						</button>
					</div>
					<video
						ref={rightMediaElem}
						id="right-video"
						onTimeUpdate={handleTimeUpdate}
						controls={false}
						onLoadedMetadata={handleLoadedMetadata}
						src={rightMedia ? `${rightMedia}` : ''}
						loop={toolSettings.playerLoop}
						onEnded={() => PlayerControls.pause()}
						muted={toolSettings.playerAudio.right.muted}
						style={unClippedMediaStyle}
					/>
				</>
			) : (
				<MediaFileInput setMediaFile={setRightMedia} />
			)}
			<div
				id="videoClipper"
				ref={videoClipper}
				style={clipperStyle}
				className={`${toolSettings.toolMode}${leftMedia ? '' : ' empty'}${toolSettings.stick ? ' stuck' : ''}${
					toolSettings.toolMode === 'divider' && toolSettings.toolOptions.auto ? ' auto' : ''
				}${clipperFlip ? ' flipped' : ''}`}>
				{leftMedia && (
					<video
						ref={leftMediaElem}
						id="left-video"
						style={clippedMediaStyle}
						controls={false}
						onLoadedMetadata={handleLoadedMetadata}
						src={leftMedia ? `${leftMedia}` : ''}
						loop={toolSettings.playerLoop}
						onEnded={() => PlayerControls.pause()}
						muted={toolSettings.playerAudio.left.muted}
					/>
				)}
			</div>
		</div>
	);
}

export default MediaContainer;
