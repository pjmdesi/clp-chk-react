import React from 'react';

import MediaFileInput from '../MediaFileInput';
import Icon from '../Icon';
import { Play } from 'lucide-react';

function MediaContainer({ toolSettings, setToolSettings, playbackStatus, leftMedia, rightMedia, setLeftMedia, setRightMedia, PlayerControls }) {
	const MediaContainer = React.useRef(),
		leftMediaElem = React.useRef(),
		rightMediaElem = React.useRef(),
		videoClipper = React.useRef();

	const [leftMediaLabel, setLeftMediaLabel] = React.useState('Left Media'),
		[rightMediaLabel, setRightMediaLabel] = React.useState('Right Media'),
		[clipperStyle, setClipperStyle] = React.useState({ width: '50%' }),
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
		}
	}, [toolSettings]);

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
		updateMediaLoopOption();
	}, [toolSettings.playerLoop]);

	const handleLoadedMetadata = video => {
		const currentPlaybackEndTime = playbackStatus.playbackEndTime;

		const newPlaybackEndTime = Math.max(currentPlaybackEndTime, video.target.duration);

		PlayerControls.setEndTime(newPlaybackEndTime);

		if (playbackStatus.playbackPosition > newPlaybackEndTime) {
			PlayerControls.setCurrentTime(newPlaybackEndTime);
		}
	};

    const handleTimeUpdate = e => {
        if (leftMedia && rightMedia) {
            PlayerControls.setCurrentTime(e.target.currentTime);
        }
    };

	const updateMediaLoopOption = () => {
		if (leftMedia && rightMedia) {
			leftMediaElem.current.loop = toolSettings.playerLoop;
			rightMediaElem.current.loop = toolSettings.playerLoop;
		}
	};

	const updateMediaPlaybackSpeed = () => {
		if (leftMedia && rightMedia) {
			leftMediaElem.current.playbackRate = toolSettings.playerSpeed;
			rightMediaElem.current.playbackRate = toolSettings.playerSpeed;
		}
	};

	const setLeftMediaFile = file => {
		setLeftMedia(file);
	};

	const setRightMediaFile = file => {
		setRightMedia(file);
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

		let vidContElem = MediaContainer.current,
			cursor = { x: event.pageX, y: event.pageY };

		if (toolSettings.toolMode === 'divider') {
			let rect = vidContElem.getBoundingClientRect(),
				position = ((cursor.x - rect.left) / vidContElem.offsetWidth) * 100;

			if (position <= 100) {
				setClipperStyle({ width: position + '%' });
				setClippedMediaStyle({ minWidth: (100 / position) * 100 + '%', zIndex: 3 });
			}
		}

		if (toolSettings.toolMode === 'circleCutout' || toolSettings.toolMode === 'boxCutout') {
			const circleSettings = {
				radius: toolSettings.toolOptions.value[toolSettings.toolMode],
			};

			let rect = vidContElem.getBoundingClientRect(),
				clipperPos = {
					x: ((event.pageX - rect.left) / vidContElem.offsetWidth) * 100,
					y: ((event.pageY - rect.top) / vidContElem.offsetHeight) * 100,
				};

			if (clipperPos.x <= 100 && clipperPos.y <= 100) {
				setClipperStyle({
					width: circleSettings.radius * 2,
					height: circleSettings.radius * 2,
					left: clipperPos.x + '%',
					top: clipperPos.y + '%',
				});

				const videoScale = {
					x: (1 / ((circleSettings.radius * 2) / vidContElem.offsetWidth)) * 100,
					y: (1 / ((circleSettings.radius * 2) / vidContElem.offsetHeight)) * 100,
				};

				setClippedMediaStyle({
					minWidth: videoScale.x + '%',
					minHeight: videoScale.y + '%',
					left: -(clipperPos.x / 100) * vidContElem.offsetWidth + leftMediaElem.current.offsetWidth / 2 + circleSettings.radius,
					top: -(clipperPos.y / 100) * vidContElem.offsetHeight + circleSettings.radius,
				});
			}
		}
	};

	const clipMediaContinuous = () => {
		let position = toolSettings.toolOptions.type === 'rightToLeft' ? 100 : 0,
			positionDirection = 1,
			timingSegment = 10,
			vidContElem = MediaContainer.current;

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

			clipMedia({ pageX: (position / 100) * vidContElem.offsetWidth, pageY: 0 });
		}, timingSegment);
	};

	const handleMouseMove = event => {
		if (toolSettings.toolMode === 'divider' && toolSettings.toolOptions.auto) return;
		clipMedia(event);
	};

	MediaContainer.onmousemove = function (event) {};

	window.onkeyup = function (keyEvent) {
		if (keyEvent.code === 'Space') {
			PlayerControls.playPause();
		}
        if (keyEvent.code === 'ArrowLeft') {
            PlayerControls.skip(-.1);
        }
		if (keyEvent.code === 'ArrowRight') {
			PlayerControls.skip(.1);
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

	const togglePlayPause = () => {
		setPlaybackStatus({ ...playbackStatus, playbackState: playbackStatus.playbackState === 'paused' ? 'playing' : 'paused' });
	};

	return (
		<div id="MediaContainer" ref={MediaContainer} onMouseMove={handleMouseMove} className={rightMedia ? '' : 'empty'}>
			{leftMedia ? (
				<div className="video-info left-video-info">
					<button className="video-closer" type="button" onClick={() => setLeftMedia('')}>
						<Icon name="X" />
					</button>
					<p className="video-label" onClick={() => openMediaFile(leftMedia)}>
						{leftMediaLabel}
					</p>
					<button className="video-meta-data" type="button">
						<Icon name="Info" />
					</button>
				</div>
			) : (
				<MediaFileInput setMediaFile={setLeftMediaFile} />
			)}
			{rightMedia ? (
				<>
					<div className="video-info right-video-info">
						<button className="video-meta-data" type="button">
							<Icon name="Info" />
						</button>
						<p className="video-label" onClick={() => openMediaFile(rightMedia)}>
							{rightMediaLabel}
						</p>
						<button className="video-closer" type="button" onClick={() => setRightMedia('')}>
							<Icon name="X" />
						</button>
					</div>
					<video ref={rightMediaElem} id="right-video" onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} src={rightMedia ? `${rightMedia}` : ''}/>
				</>
			) : (
				<MediaFileInput setMediaFile={setRightMediaFile} />
			)}
			<div id="videoClipper" ref={videoClipper} style={clipperStyle} className={`${toolSettings.toolMode}${leftMedia ? '' : ' empty'}`}>
				{leftMedia && (
					<video ref={leftMediaElem} id="left-video" style={clippedMediaStyle} onLoadedMetadata={handleLoadedMetadata} src={leftMedia ? `${leftMedia}` : ''} />
				)}
			</div>
		</div>
	);
}

export default MediaContainer;
