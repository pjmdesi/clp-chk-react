import React from 'react';

import VideoContainer from '../VideoContainer';
import ControllerBar from '../ControllerBar';
import ModalContainer from '../ModalContainer';

const defaultToolSettings = {
	toolMode: 'divider',
	toolOptions: {
		auto: false,
		type: 'backAndForth',
		value: {
            divider: 10,
            boxCutout: 200,
            circleCutout: 200,
        }
	},
	playerSpeed: 1,
	playerLoop: false,
};

function MainContainer() {
	const defaultPlaybackStatus = {
		playbackState: 'paused',
		playbackPosition: 0,
	};

	const [currentModal, setCurrentModal] = React.useState(null),
		[toolSettings, setToolSettings] = React.useState(defaultToolSettings),
		[playbackStatus, setPlaybackStatus] = React.useState(defaultPlaybackStatus),
		[leftVideo, setLeftVideo] = React.useState('/main_window/assets/test-videos/fallout-4-test-clip-2.mp4'),
		[rightVideo, setRightVideo] = React.useState('/main_window/assets/test-videos/fallout-4-test-clip-4.mp4');

	console.log({ toolSettings });

	return (
		<div id="mainContainer">
			<VideoContainer
				toolSettings={toolSettings}
				playbackStatus={playbackStatus}
				leftVideo={leftVideo}
				rightVideo={rightVideo}
				setLeftVideo={setLeftVideo}
				setRightVideo={setRightVideo}
			/>
			<ControllerBar
				toolSettings={toolSettings}
				leftVideo={leftVideo}
				rightVideo={rightVideo}
                setLeftVideo={setLeftVideo}
                setRightVideo={setRightVideo}
				setToolSettings={setToolSettings}
				playbackStatus={playbackStatus}
				setPlaybackStatus={setPlaybackStatus}
			/>
			<ModalContainer currentModal={currentModal} setCurrentModal={setCurrentModal} />
		</div>
	);
}

export default MainContainer;
