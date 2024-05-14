import React from 'react';

import MediaFileInput from '../MediaFileInput';
import Icon from '../Icon';

function MediaContainer({ toolSettings, setToolSettings, playbackStatus, leftMedia, rightMedia, setLeftMedia, setRightMedia, PlayerControls }) {
	const mediaContainerElem = React.useRef(),
		leftMediaElem = React.useRef(),
		rightMediaElem = React.useRef(),
		videoClipper = React.useRef();

	const [leftMediaLabel, setLeftMediaLabel] = React.useState('Left Media'),
		[rightMediaLabel, setRightMediaLabel] = React.useState('Right Media'),
		[clipperStyle, setClipperStyle] = React.useState({ width: '50%' }),
		[clipperFlip, setClipperFlip] = React.useState(false),
		[clippedMediaStyle, setClippedMediaStyle] = React.useState({ minWidth: '200%', zIndex: 3 }),
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

	const clipMedia = event => {
		if (!(leftMedia && rightMedia)) return;

		const mediaContElem = mediaContainerElem.current;
		const containerOffset = {
			left: mediaContElem.getBoundingClientRect().left,
			top: mediaContElem.getBoundingClientRect().top,
		};

		if (!event) {
			event = { pageX: mediaContElem.offsetWidth / 2, pageY: mediaContElem.offsetHeight / 2 };
			containerOffset.left = 0;
			containerOffset.top = 0;
		}

		let cursor = { x: event.pageX, y: event.pageY };

		if (toolSettings.toolMode === 'divider') {
			let position = ((cursor.x - containerOffset.left) / mediaContElem.offsetWidth) * 100;

			if (position <= 100) {
				setClipperStyle({ width: position + '%' });
				setClippedMediaStyle({ minWidth: (100 / position) * 100 + '%', zIndex: 3 });
			}
		}

		if (toolSettings.toolMode === 'circleCutout' || toolSettings.toolMode === 'boxCutout') {
			const circleSettings = {
				radius: toolSettings.toolOptions.value[toolSettings.toolMode],
			};

			let clipperPos = {
				x: ((event.pageX - containerOffset.left) / mediaContElem.offsetWidth) * 100,
				y: ((event.pageY - containerOffset.top) / mediaContElem.offsetHeight) * 100,
			};

			if (clipperPos.x <= 100 && clipperPos.y <= 100) {
				setClipperStyle({
					width: circleSettings.radius * 2,
					height: circleSettings.radius * 2,
					left: clipperPos.x + '%',
					top: clipperPos.y + '%',
				});

				// Set the clipper to flipped if it's on the right side of the screen
				setClipperFlip(clipperPos.x > ((mediaContElem.offsetWidth - circleSettings.radius) / mediaContElem.offsetWidth) * 100);

				const videoScale = {
					x: (1 / ((circleSettings.radius * 2) / mediaContElem.offsetWidth)) * 100,
					y: (1 / ((circleSettings.radius * 2) / mediaContElem.offsetHeight)) * 100,
				};

				const mediaContainerH = mediaContElem.offsetHeight;

				const clippedVideoOffset = mediaContainerH > circleSettings.radius * 2 ? 0 : (circleSettings.radius * 2 - mediaContainerH) / 2;

				setClippedMediaStyle({
					minWidth: videoScale.x + '%',
					minHeight: videoScale.y + '%',
					left: -(clipperPos.x / 100) * mediaContElem.offsetWidth + leftMediaElem.current.offsetWidth / 2 + circleSettings.radius,
					top: circleSettings.radius - clippedVideoOffset - (clipperPos.y / 100) * mediaContElem.offsetHeight,
				});
			}
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

	const moveClipperWithMouse = event => {
		if (toolSettings.toolMode === 'divider' && toolSettings.toolOptions.auto) return;
		if (toolSettings.stick) return;
		clipMedia(event);
	};

	const toggleClipperLock = e => {
		if (e.target.parentElement.id !== 'mediaContainer' && e.target.parentElement.id !== 'videoClipper') return;
		if (!leftMedia || !rightMedia) return;
		if (toolSettings.toolMode === 'divider' && toolSettings.toolOptions.auto) return;
		setToolSettings({ ...toolSettings, stick: !toolSettings.stick });
	};

	mediaContainerElem.onmousemove = function (event) {};

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
		<div id="mediaContainer" ref={mediaContainerElem} onMouseMove={moveClipperWithMouse} className={rightMedia ? '' : 'empty'} onClick={e => toggleClipperLock(e)}>
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
						<Icon name={toolSettings.playerAudio.left.muted?"VolumeX":"Volume2"} color={toolSettings.playerAudio.left.muted?'yellow':'white'} />
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
							<Icon name={toolSettings.playerAudio.right.muted?"VolumeX":"Volume2"}  color={toolSettings.playerAudio.right.muted?'yellow':'white'} />
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
