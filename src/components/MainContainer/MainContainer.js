import React from 'react';

import MediaContainer from '../MediaContainer';
import ControllerBar from '../ControllerBar';

// Set the defaults for starting the app
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
			boxCutout: 200,
			circleCutout: 200,
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
            volume: .8,
            muted: true,
        },
        right: {
            volume: .8,
            muted: true,
        },
    },
};

function MainContainer() {
	const defaultPlaybackStatus = {
		// Whether the video is playing or paused
		playbackState: 'paused',
		// The current position in the videos, used for syncing the videos
		playbackPosition: 0,
        playbackEndTime: 0,
	};

    const leftMediaFromMemory = localStorage.getItem('leftMedia') || '';
    const rightMediaFromMemory = localStorage.getItem('rightMedia') || '';

	const [toolSettings, setToolSettings] = React.useState(defaultToolSettings),
		[playbackStatus, setPlaybackStatus] = React.useState(defaultPlaybackStatus),
		[leftMedia, setLeftMedia] = React.useState(leftMediaFromMemory),
		[rightMedia, setRightMedia] = React.useState(rightMediaFromMemory);

        // console.log({playbackStatus});
        // console.log({toolSettings});

	const PlayerControls = {
		playPause: () => {
			if (leftMedia && rightMedia) {
				const newPlaybackStatus = { ...playbackStatus };
				newPlaybackStatus.playbackState = playbackStatus.playbackState === 'paused' ? 'playing' : 'paused';

				setPlaybackStatus(newPlaybackStatus);
			}
		},
        play: () => {
            if (leftMedia && rightMedia) {
                const newPlaybackStatus = { ...playbackStatus };
                newPlaybackStatus.playbackState = 'playing';

                setPlaybackStatus(newPlaybackStatus);
            }
        },
        pause: () => {
            if (leftMedia && rightMedia) {
                const newPlaybackStatus = { ...playbackStatus };
                newPlaybackStatus.playbackState = 'paused';

                setPlaybackStatus(newPlaybackStatus);
            }
        },
		skip: time => {
			if (leftMedia && rightMedia) {
				const newPlaybackStatus = { ...playbackStatus };
				newPlaybackStatus.playbackPosition += time;

				setPlaybackStatus(newPlaybackStatus);
			}
		},
        setCurrentTime: time => {
            if (leftMedia && rightMedia) {
                const newPlaybackStatus = { ...playbackStatus };
                newPlaybackStatus.playbackPosition = time;

                setPlaybackStatus(newPlaybackStatus);
            }
        },
        setEndTime: time => {
            if (leftMedia && rightMedia) {
                const newPlaybackStatus = { ...playbackStatus };
                newPlaybackStatus.playbackEndTime = time;

                setPlaybackStatus(newPlaybackStatus);
            }
        },
	};

    React.useEffect(() => {
        localStorage.setItem('leftMedia', leftMedia);
    }, [leftMedia]);

    React.useEffect(() => {
        localStorage.setItem('rightMedia', rightMedia);
    }, [rightMedia]);

	return (
		<div id="mainContainer">
			<MediaContainer
				toolSettings={toolSettings}
				setToolSettings={setToolSettings}
				playbackStatus={playbackStatus}
				leftMedia={leftMedia}
				rightMedia={rightMedia}
				setLeftMedia={setLeftMedia}
				setRightMedia={setRightMedia}
				PlayerControls={PlayerControls}
			/>
			<ControllerBar
				toolSettings={toolSettings}
				leftMedia={leftMedia}
				rightMedia={rightMedia}
				setLeftMedia={setLeftMedia}
				setRightMedia={setRightMedia}
				setToolSettings={setToolSettings}
				playbackStatus={playbackStatus}
				PlayerControls={PlayerControls}
			/>
		</div>
	);
}

export default MainContainer;
