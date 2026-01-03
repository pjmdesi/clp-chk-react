import React from 'react';

import PlayerControl from '../PlayerControl';
import PlayerSlider from '../PlayerSlider';
import PlayerRadioButtons from '../PlayerRadioButtons';
import PlayerToggle from '../PlayerToggle/PlayerToggle';
import Icon from '../Icon';
import UserSettingsControl from '../UserSettingsControl';
import { secondsToTimecode } from '../../utils/timecode';

function ControllerBar({
	toolSettings,
	setToolSettings,
	appSettings,
	setAppSettings,
	toolSettingsRef,
	appSettingsRef,
	playbackStatus,
	leftMedia,
	rightMedia,
	setLeftMedia,
	setRightMedia,
	PlayerControls,
	leftMediaMetaData,
	rightMediaMetaData,
	viewportSize,
	isInElectron,
	setCurrentModal,
}) {
	const [hasAnyVideo, setHasAnyVideo] = React.useState(false);
    const [hasBothMedia, setHasBothMedia] = React.useState(!!leftMedia && !!rightMedia);
	const [windowIsSmallerThanMedia, setWindowIsSmallerThanMedia] = React.useState(null);

	const updateToolSettings = (newSettingVal, setting) => {
		const newSettings = { ...toolSettings };
		newSettings[setting] = newSettingVal;

		setToolSettings(newSettings);
	};

	const updateToolSettingOptions = (newSettingVal, setting) => {
		if (typeof setting === 'undefined') return;

		const newSettings = { ...toolSettings.toolOptions };
		newSettings[setting] = newSettingVal;

		updateToolSettings(newSettings, 'toolOptions');
	};

	const updateToolSettingOptionsValue = (newSettingVal, setting) => {
		if (typeof setting === 'undefined') return;

		const newSettings = { ...toolSettings.toolOptions.value };
		newSettings[setting] = newSettingVal;

		updateToolSettingOptions(newSettings, 'value');
	};

	const updateControllerBarOptions = (newSettingVal, setting) => {
		const newSettings = { ...toolSettings.controllerBarOptions };
		newSettings[setting] = newSettingVal;

		updateToolSettings(newSettings, 'controllerBarOptions');
	};

	const swapMedias = () => {
		const newLeftMedia = rightMedia;
		const newRightMedia = leftMedia;

		setLeftMedia(newLeftMedia);
		setRightMedia(newRightMedia);
	};

	const sizeWindowToFitMedia = () => {
		console.log('[ControllerBar] sizeWindowToFitMedia called');
		if (leftMediaMetaData && rightMediaMetaData) {
			// get media elements dimensions
			const leftVideoWidth = leftMediaMetaData.width || 0;
			const leftVideoHeight = leftMediaMetaData.height || 0;

			const rightVideoWidth = rightMediaMetaData.width || 0;
			const rightVideoHeight = rightMediaMetaData.height || 0;

			// Determine the larger dimensions
			const videoWidth = Math.max(leftVideoWidth, rightVideoWidth);
			const videoHeight = Math.max(leftVideoHeight, rightVideoHeight);

			console.log(`Detected video dimensions: ${videoWidth}x${videoHeight}`);

			if (videoWidth && videoHeight) {
				let targetWidth = videoWidth;
				let targetHeight = videoHeight;

				// Calculate target window size including some extra space for borders/toolbars
				const rootElem = document.getElementById('root');

				// get padding from rendered root element styles
				const rootStyles = window.getComputedStyle(rootElem);
				const rootExtraWidth = parseFloat(rootStyles.paddingLeft) + parseFloat(rootStyles.paddingRight);
				const rootExtraHeight = parseFloat(rootStyles.paddingTop) + parseFloat(rootStyles.paddingBottom);

				targetWidth += rootExtraWidth;
				targetHeight += rootExtraHeight;

				if (!toolSettings.controllerBarOptions.floating) {
					const controllerBarElem = document.getElementById('controllerBar');
					const controllerBarExtraHeight = controllerBarElem ? controllerBarElem.offsetHeight : 0;

					targetHeight += controllerBarExtraHeight;
				}

				console.log(`Calculated window dimensions: ${targetWidth}, ${targetHeight}`);

				// Resize window using the exposed API
				if (window.api?.resizeWindow) {
					console.log(`Resizing window to fit media: ${targetWidth}, ${targetHeight}`);

					window.api.resizeWindow({ width: targetWidth, height: targetHeight });
				}
			}
		}
	};

	const toolModeSet = {
		divider: {
			name: 'divider',
			icon: 'SeparatorVertical',
			label: 'Vertical Divider',
			action: () => updateToolSettings('divider', 'toolMode'),
			optionSet: {
				backAndForth: {
					name: 'backAndForth',
					icon: 'ArrowRightLeft',
					label: 'Back and Forth',
					action: () => updateToolSettingOptions('backAndForth', 'type'),
				},
				leftToRight: {
					name: 'leftToRight',
					icon: 'ArrowRightFromLine',
					label: 'Left to Right',
					action: () => updateToolSettingOptions('leftToRight', 'type'),
				},
				rightToLeft: {
					name: 'rightToLeft',
					icon: 'ArrowLeftFromLine',
					label: 'Right top Left',
					action: () => updateToolSettingOptions('rightToLeft', 'type'),
				},
			},
		},
        horizontalDivider: {
            name: 'horizontalDivider',
            icon: 'SeparatorHorizontal',
            label: 'Horizontal Divider',
            action: () => updateToolSettings('horizontalDivider', 'toolMode'),
            optionSet: {
                backAndForth: {
                    name: 'backAndForth',
                    icon: 'ArrowUpDown',
                    label: 'Back and Forth',
                    action: () => updateToolSettingOptions('backAndForth', 'type'),
                },
                topToBottom: {
                    name: 'topToBottom',
                    icon: 'ArrowDownFromLine',
                    label: 'Top to Bottom',
                    action: () => updateToolSettingOptions('topToBottom', 'type'),
                },
                bottomToTop: {
                    name: 'bottomToTop',
                    icon: 'ArrowUpFromLine',
                    label: 'Bottom to Top',
                    action: () => updateToolSettingOptions('bottomToTop', 'type'),
                },
            },
        },
		circleCutout: {
			name: 'circleCutout',
			value: 'circleCutout',
			icon: 'CircleDashed',
			label: 'Circle Cutout',
			action: () => updateToolSettings('circleCutout', 'toolMode'),
			optionSet: {},
		},
		boxCutout: {
			name: 'boxCutout',
			value: 'boxCutout',
			icon: 'BoxSelect',
			label: 'Box Cutout',
			action: () => updateToolSettings('boxCutout', 'toolMode'),
			optionSet: {},
		},
	};

	const playerSpeedSet = {
		oneFourth: {
			name: 'oneFourth',
			label: '¼',
			value: 0.25,
			title: 'One-quarter Speed',
			action: () => updateToolSettings(0.25, 'playerSpeed'),
		},
		oneHalf: {
			name: 'oneHalf',
			label: '½',
			value: 0.5,
			title: 'Half Speed',
			action: () => updateToolSettings(0.5, 'playerSpeed'),
		},
		normal: {
			name: 'normal',
			label: 'x1',
			value: 1,
			title: 'Normal Speed',
			action: () => updateToolSettings(1, 'playerSpeed'),
		},
		twoTimes: {
			name: 'twoTimes',
			label: 'x2',
			value: 2,
			title: 'Twice Speed',
			action: () => updateToolSettings(2, 'playerSpeed'),
		},
		fourTimes: {
			name: 'fourTimes',
			label: 'x4',
			value: 4,
			title: 'Four-times Speed',
			action: () => updateToolSettings(4, 'playerSpeed'),
		},
		eightTimes: {
			name: 'eightTimes',
			label: 'x8',
			value: 8,
			title: 'Eight-times Speed\n(Warning: May cause performance issues)',
			action: () => updateToolSettings(8, 'playerSpeed'),
		},
	};

	const wasPlayingBeforeScrub = React.useRef(false);

	// Use the maximum framerate from both videos for smooth playback control
	const leftFramerate = leftMediaMetaData?.framerate || 0;
	const rightFramerate = rightMediaMetaData?.framerate || 0;
	const framerate = Math.max(leftFramerate, rightFramerate) || 30; // Default to 30 if both are 0

	// Determine if we have videos or only images
	const leftMediaType = leftMediaMetaData?.mediaType || null;
	const rightMediaType = rightMediaMetaData?.mediaType || null;

	// Detect if window mediaContainer size is larger or smaller than video size (use width only for now)
	const mediaVsContainerSizeCheck = () => {
		const [leftMediaElement, rightMediaElement] = [leftMediaMetaData ? leftMediaMetaData.width : 0, rightMediaMetaData ? rightMediaMetaData.width : 0];

		const viewPortWidth = viewportSize ? viewportSize.width : window.innerWidth;

		if (Math.max(leftMediaElement, rightMediaElement) > viewPortWidth) {
			setWindowIsSmallerThanMedia(true);
		} else {
			setWindowIsSmallerThanMedia(false);
		}
	};

	React.useEffect(() => {
		setHasAnyVideo(leftMediaType === 'video' || rightMediaType === 'video');
        setHasBothMedia(!!leftMediaMetaData && !!rightMediaMetaData);
		mediaVsContainerSizeCheck();
	}, [viewportSize, leftMediaMetaData, rightMediaMetaData, toolSettings.controllerBarOptions.floating]);

	return (
		<div
			id="controllerBar"
			className={`${toolSettings.controllerBarOptions.floating ? 'floating' : 'docked'}${hasAnyVideo ? ' videos' : ''}`}>
			{hasAnyVideo && (
				<PlayerSlider
					id="videoProgressSlider"
					name="Playback Position"
					sliderMinMax={[0, playbackStatus.playbackEndTime]}
					value={playbackStatus.playbackPosition}
					stepValue={0.01}
					onChange={time => {
						PlayerControls.setCurrentTime(time);
					}}
					onChangeStart={() => {
						wasPlayingBeforeScrub.current = playbackStatus.playbackState === 'playing';
						PlayerControls.pause();
						PlayerControls.setIsScrubbing(true);
					}}
					onChangeComplete={time => {
						// First turn off scrubbing, then resume if needed
						setTimeout(() => {
							PlayerControls.setIsScrubbing(false);
							if (wasPlayingBeforeScrub.current) {
								setTimeout(() => {
									PlayerControls.play();
								}, 0);
							}
						}, 0);
					}}
					valueFormatter={seconds => secondsToTimecode(seconds, framerate)}
				/>
			)}
			<div className={`control-group ${hasBothMedia ? '' : 'disabled'}`}>
				<PlayerControl id="swapMediasButton" iconName="GitCompareArrows" title="Swap videos" onClick={() => swapMedias()} />
				<PlayerRadioButtons id="toolModeButtonSet" buttonSet={toolModeSet} value={toolSettings.toolMode} />
				<div className="control-subgroup">
					{/* !BROKEN - adjustments for auto sweeper */}
                        {(toolSettings.toolMode === 'divider' || toolSettings.toolMode === 'horizontalDivider') && (
						<PlayerToggle
							id="autoDividerButton"
							name="Move Divider Automatically"
							labelText="AUTO"
							onChange={updateToolSettingOptions}
							option="auto"
							value={toolSettings.toolOptions.auto}
						/>
					)}
					{!!Object.keys(toolModeSet[toolSettings.toolMode].optionSet).length && toolSettings.toolOptions.auto && (
						<>
							<PlayerRadioButtons id="toolOptions" buttonSet={toolModeSet[toolSettings.toolMode].optionSet} value={toolSettings.toolOptions.type} />
							<PlayerSlider
                                defaultSliderValue={24}
								id="transitionSpeedSlider"
								name="Transition Speed"
								sliderMinMax={[10, 200]}
								value={toolSettings.toolOptions.value[toolSettings.toolMode]}
								stepValue={1}
								onChange={updateToolSettingOptionsValue}
								option={toolSettings.toolMode}
								label="/ min"
							/>
						</>
					)}
					{['boxCutout', 'circleCutout'].includes(toolSettings.toolMode) && (
						<PlayerSlider
							defaultSliderValue={200}
							id="clipperSizeSlider"
							name="Tool Size"
							sliderMinMax={[100, 500]}
							value={toolSettings.toolOptions.value[toolSettings.toolMode]}
							stepValue={1}
							onChange={updateToolSettingOptionsValue}
							option={toolSettings.toolMode}
							label="px"
						/>
					)}
				</div>
			</div>
			{hasAnyVideo && (
				<div className="control-group">
					<div className="control-subgroup">
						<PlayerControl id="skipBackButton" iconName="SkipBack" onClick={() => PlayerControls.setCurrentTime(0)} />
						<PlayerControl id="stepBackButton" iconName="StepBack" onClick={() => PlayerControls.skip(-0.1)} />
						<PlayerControl id="playPauseButton" iconName={playbackStatus.playbackState === 'playing' ? 'Pause' : 'Play'} onClick={() => PlayerControls.playPause()} />
						<PlayerControl id="stepForwardButton" iconName="StepForward" onClick={() => PlayerControls.skip(0.1)} />
						<PlayerControl id="skipForwardButton" iconName="SkipForward" onClick={() => PlayerControls.setCurrentTime(playbackStatus.playbackEndTime - 0.1)} />
					</div>
					<div className="control-subgroup">
						<PlayerToggle
							id="playLoopToggle"
							iconName="IterationCw"
							onChange={updateToolSettings}
							value={toolSettings.playerLoop}
							option="playerLoop"
							title="Loop Medias"
						/>
						<PlayerRadioButtons id="playerSpeedButtonSet" buttonSet={playerSpeedSet} value={toolSettings.playerSpeed} autoFold />
						{toolSettings.playerSpeed === 8 && (
							<button title="Warning: 8x speed might cause performance issue such as de-sync and frame skipping" disabled>
								<Icon name="TriangleAlert" color="yellow" />
							</button>
						)}
					</div>
				</div>
			)}
			<div className="control-group">
				<PlayerToggle
					id="controllerBarPosition"
					title="Use Floating Control Bar"
					iconName="Dock"
					onChange={updateControllerBarOptions}
					value={toolSettings.controllerBarOptions.floating}
					option="floating"
					className="ignore-disabled"
				/>
				{isInElectron && (
					<button id="sizeWindowToFitMedia" title="Size Window to Fit Larger Media Dimensions at 100% Scale" onClick={sizeWindowToFitMedia}>
						<Icon name={windowIsSmallerThanMedia ? 'Maximize2' : 'Minimize2'} />
					</button>
				)}
				<button
					id="settingsModalButton"
					title="Open Settings"
					onClick={() => {
						if (!setCurrentModal) {
							return;
						}

						setCurrentModal({
							key: 'settings',
							title: 'Settings',
							component: UserSettingsControl,
							props: {
								toolSettings,
								setToolSettings,
								appSettings,
								setAppSettings,
								toolSettingsRef,
								appSettingsRef,
							},
						});
					}}>
					<Icon name="Settings" />
				</button>
			</div>
		</div>
	);
}

export default ControllerBar;
