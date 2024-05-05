import React from 'react';

import VideoPlayer from '../VideoPlayer';
import VideoFileInput from '../VideoFileInput';
import Icon from '../Icon';

function VideoContainer({ toolSettings, playbackStatus, leftVideo, rightVideo, setLeftVideo, setRightVideo }) {
	/* var videoContainer = document.getElementById('video-compare-container'),
		leftVideo = document.getElementById('left-video'),
		rightVideo = document.getElementById('right-video'),
		leftVideoOverlay = document.getElementById('left-video-overlay'),
		rightVideoOverlay = document.getElementById('right-video-overlay'),
		leftVideoLabel = document.getElementById('left-video-label'),
		rightVideoLabel = document.getElementById('right-video-label'); */

	const videoContainer = React.useRef(),
		leftVideoElem = React.useRef(),
		rightVideoElem = React.useRef(),
		videoClipper = React.useRef();

	const [dividerPosition, setDividerPosition] = React.useState({ x: 50, y: 50 }),
		[leftVideoLabel, setLeftVideoLabel] = React.useState(''),
		[rightVideoLabel, setRightVideoLabel] = React.useState(''),
		[clipperStyle, setClipperStyle] = React.useState({ width: '50%' }),
		[clippedVideoStyle, setClippedVideoStyle] = React.useState({ minWidth: '200%', zIndex: 3 });

	React.useEffect(() => {
		if (leftVideo && rightVideo) {
			if (playbackStatus.playbackState === 'playing') {
				leftVideoElem.current.play();
				rightVideoElem.current.play();
			}

			if (playbackStatus.playbackState === 'paused') {
				leftVideoElem.current.pause();
				rightVideoElem.current.pause();
			}
		}
	}, [playbackStatus, leftVideo, rightVideo]);

	const setLeftVideoFile = file => {
		setLeftVideo(file);
	};

	const setRightVideoFile = file => {
		setRightVideo(file);
	};

	/* 	leftVideo.onloadedmetadata = function () {
		appendMetaData(leftVideo, leftVideo.children[0].src, leftVideoOverlay);
	};
	rightVideo.onloadedmetadata = function () {
		appendMetaData(rightVideo, rightVideo.children[0].src, rightVideoOverlay);
	};

	leftVideo.onpause = function () {
		syncPosition(0);
	};
	rightVideo.onpause = function () {
		syncPosition(0);
	};

	leftVideo.onplay = function () {
		syncPosition(0);
	};
	rightVideo.onplay = function () {
		syncPosition(0);
	};

	rightVideoLabel.innerHTML = document.getElementById('right-video').getElementsByTagName('source')[0].getAttribute('src');
	leftVideoLabel.innerHTML = document.getElementById('left-video').getElementsByTagName('source')[0].getAttribute('src');

	leftVideo.onended = function () {
		if (rightVideo.ended) document.getElementById('play-pause-button').src = ICON_REPLAY;
	};

	rightVideo.onended = function () {
		if (leftVideo.ended) document.getElementById('play-pause-button').src = ICON_REPLAY;
	}; */

	const clipVideo = event => {
		// if (!(leftVideo && rightVideo)) return;

		let vidContElem = videoContainer.current,
			cursor = { x: event.pageX, y: event.pageY };

		if (toolSettings.toolMode === 'divider') {
			let rect = vidContElem.getBoundingClientRect(),
				position = ((cursor.x - rect.left) / vidContElem.offsetWidth) * 100;

			if (position <= 100) {
				setClipperStyle({ width: position + '%' });
				setClippedVideoStyle({ minWidth: (100 / position) * 100 + '%', zIndex: 3 });
			}
		}

		if (toolSettings.toolMode === 'circleCutout' || toolSettings.toolMode === 'boxCutout') {
			const circleSettings = {
				radius: toolSettings.toolOptions.value,
			};

			let rect = vidContElem.getBoundingClientRect(),
				clipperPos = {
					x: ((event.pageX - rect.left) / vidContElem.offsetWidth) * 100,
					y: ((event.pageY - rect.top) / vidContElem.offsetHeight) * 100,
				};

			if (clipperPos.x <= 100 && clipperPos.y <= 100) {
				console.log(clipperPos.x, clipperPos.y, circleSettings.radius, clipperPos.x - circleSettings.radius, clipperPos.y - circleSettings.radius);

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

				setClippedVideoStyle({
					minWidth: videoScale.x + '%',
					minHeight: videoScale.y + '%',
					left: -(clipperPos.x / 100) * vidContElem.offsetWidth + leftVideoElem.current.offsetWidth / 2 + circleSettings.radius,
					top: -(clipperPos.y / 100) * vidContElem.offsetHeight + circleSettings.radius,
				});
			}
		}
	};

	const handleMouseMove = event => {
		clipVideo(event);
	};

	videoContainer.onmousemove = function (event) {};

	window.onkeyup = function (keyEvent) {
		if (keyEvent.key === 'i' || keyEvent.key === 'I') {
			leftVideoOverlay.hidden ? (leftVideoOverlay.hidden = false) : (leftVideoOverlay.hidden = true);
			rightVideoOverlay.hidden ? (rightVideoOverlay.hidden = false) : (rightVideoOverlay.hidden = true);
		}
		if (keyEvent.code === 'Space') {
			togglePlayPause();
		}
		if (keyEvent.code === 'ArrowRight') {
			seekFrames(1);
		}
		if (keyEvent.code === 'ArrowLeft') {
			seekFrames(-1);
		}
	};

	const appendMetaData = (video, source, overlay) => {
		// overlay.innerHTML = 'Source: ' + source + '<br>' + 'Resolution: ' + video.videoWidth + 'x' + video.videoHeight;
	};

	const getCurrentFrame = video => {
		// return video.currentTime * FRAME_RATE;
	};

	const getNewPosition = (video, nrOfFrames) => {
		// return (getCurrentFrame(video) + nrOfFrames) / FRAME_RATE; //+ 0.00001
	};

	const syncVideoStart = () => {
		var mediaLoaded = [];
		var videos = [leftVideoElem.current, rightVideoElem.current];
		// videos.forEach(function (video) {
		// 	video.oncanplaythrough = function () {
		// 		mediaLoaded.push(true);
		// 		if (mediaLoaded.length === videos.length) {
		// 			videos.forEach(function (video) {
		// 				video.play();
		// 			});
		// 		}
		// 	};
		// });
	};

	// see: http://www.inconduit.com/smpte/
	const seekFrames = nrOfFrames => {
		// var playpause = document.getElementById('play-pause-button');
		// if (!leftVideoElem.paused) togglePause(playpause, leftVideoElem);
		// if (!rightVideoElem.paused) togglePause(playpause, rightVideoElem);
		// setNewPosition(nrOfFrames);
	};

	const setNewPosition = nrOfFrames => {
		// var newPosLeft = getNewPosition(leftVideo, nrOfFrames);
		// var newPosRight = getNewPosition(rightVideo, nrOfFrames);
		// // use the most recent frame as the one to sync to
		// if (newPosLeft > newPosRight) {
		// 	leftVideo.currentTime = newPosLeft;
		// 	rightVideo.currentTime = newPosLeft;
		// } else {
		// 	// the right video is at the latest frame OR they're equal and it doesn't matter
		// 	leftVideo.currentTime = newPosRight;
		// 	rightVideo.currentTime = newPosRight;
		// }
	};

	const syncPosition = nrOfFrames => {
		// if (getCurrentFrame(leftVideo) != getCurrentFrame(rightVideo)) setNewPosition(nrOfFrames);
	};

	const togglePlayPause = () => {
		let playpause = document.getElementById('play-pause-button');
		leftVideo.paused ? togglePlay(playpause, leftVideo) : togglePause(playpause, leftVideo);
		rightVideo.paused ? togglePlay(playpause, rightVideo) : togglePause(playpause, rightVideo);
	};

	const togglePause = (button, video) => {
		// button.src = ICON_PLAY;
		// video.pause();
	};

	const togglePlay = (button, video) => {
		// button.src = ICON_PAUSE;
		// video.play();
	};

	syncVideoStart();

	return (
		<div id="videoContainer" ref={videoContainer} onMouseMove={handleMouseMove} className={rightVideo && leftVideo ? '' : 'empty'}>
			{leftVideo ? (
				<div className="video-info left-info">
					<p className="video-label vl-left">{leftVideoLabel}</p>
					<button className="video-closer" type="button" onClick={() => setLeftVideo('')}>
						<Icon name="X" />
					</button>
				</div>
			) : (
				<VideoFileInput setVideoFile={setLeftVideoFile} />
			)}
			{rightVideo ? (
				<>
					<div className="video-info right-info">
						<p className="video-label vl-right">{rightVideoLabel}</p>
						<button className="video-closer" type="button" onClick={() => setRightVideo('')}>
							<Icon name="X" />
						</button>
					</div>
					<video ref={rightVideoElem} id="right-video">
						<source src={rightVideo ? `${rightVideo}` : ''} />
					</video>
				</>
			) : (
				<VideoFileInput setVideoFile={setRightVideoFile} />
			)}
			<div id="videoClipper" ref={videoClipper} style={clipperStyle} className={toolSettings.toolMode}>
				{leftVideo && (
					<video ref={leftVideoElem} id="left-video" style={clippedVideoStyle}>
						<source src={leftVideo ? `${leftVideo}` : ''} />
					</video>
				)}
			</div>
		</div>
	);
}

export default VideoContainer;
