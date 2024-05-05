import React from 'react';

import PlayerControl from '../PlayerControl';
import PlayerSlider from '../PlayerSlider';
import PlayerRadioButtons from '../PlayerRadioButtons';
import ModalButton from '../ModalButton';
import PlayerToggle from '../PlayerToggle/PlayerToggle';

function ControllerBar({ toolSettings, setToolSettings, playbackStatus, setPlaybackStatus, leftVideo, rightVideo }) {
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

	const playPause = () => {
		if (leftVideo && rightVideo) {
			const newPlaybackStatus = { ...playbackStatus };
			newPlaybackStatus.playbackState = playbackStatus.playbackState === 'paused' ? 'playing' : 'paused';

			setPlaybackStatus(newPlaybackStatus);
			console.log({ newPlaybackStatus });
		}
	};

	const toolModeSet = {
		divider: {
			name: 'divider',
			icon: 'SeparatorVertical',
			label: 'Straight Divider',
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
			action: () => updateToolSettings(0.25, 'playerSpeed'),
		},
		// oneThird: {
		// 	name: 'oneThird',
		// 	label: '⅓',
		// 	value: 0.33,
		// 	action: () => updateToolSettings(0.33, 'playerSpeed'),
		// },
		oneHalf: {
			name: 'oneHalf',
			label: '½',
			value: 0.5,
			action: () => updateToolSettings(0.5, 'playerSpeed'),
		},
		normal: {
			name: 'normal',
			label: 'x1',
			value: 1,
			action: () => updateToolSettings(1, 'playerSpeed'),
		},
		twoTimes: {
			name: 'twoTimes',
			label: 'x2',
			value: 2,
			action: () => updateToolSettings(2, 'playerSpeed'),
		},
		// threeTimes: {
		// 	name: 'threeTimes',
		// 	label: 'x3',
		// 	value: 3,
		// 	action: () => updateToolSettings(3, 'playerSpeed'),
		// },
		fourTimes: {
			name: 'fourTimes',
			label: 'x4',
			value: 4,
			action: () => updateToolSettings(4, 'playerSpeed'),
		},
	};

	return (
		<div id="controllerBar">
			<div className="control-group">
				<div className="control-radio-group">
					<PlayerRadioButtons id="toolModeButtonSet" buttonSet={toolModeSet} value={toolSettings.toolMode} />
				</div>
				<div className="control-subgroup">
					{toolSettings.toolMode === 'divider' && (
						<div className="control-checkbox-container">
							<PlayerToggle
								id="autoDividerButton"
								type="checkbox"
								labelText="AUTO"
								onChange={updateToolSettingOptions}
								toolOption="auto"
								value={toolSettings.toolOptions.auto}
							/>
						</div>
					)}
					{!!Object.keys(toolModeSet[toolSettings.toolMode].optionSet).length && toolSettings.toolOptions.auto && (
						<div className="control-radio-group control-radio-subgroup">
							<PlayerRadioButtons id="toolOptions" buttonSet={toolModeSet[toolSettings.toolMode].optionSet} value={toolSettings.toolOptions.type} />
							<PlayerSlider
								id="transitionSpeedSlider"
								name="Transition Speed"
								sliderValues={[0, toolSettings.toolOptions.value, 1]}
								stepValue={0.01}
								onChange={updateToolSettingOptions}
								toolOption="value"
							/>
						</div>
					)}
					{toolSettings.toolMode === 'circleCutout' && (
						<div className="control-radio-group control-radio-subgroup">
							<PlayerSlider
								id="clipperRadiusSlider"
								name="Radius"
								sliderValues={[100, toolSettings.toolOptions.value, 500]}
								stepValue={1}
								onChange={updateToolSettingOptions}
								toolOption="value"
							/>
						</div>
					)}
				</div>
			</div>
			<div className="control-group">
				<div className="control-subgroup">
					<PlayerControl id="skipBackButton" iconName="SkipBack" />
					<PlayerControl id="stepBackButton" iconName="StepBack" />
					<PlayerControl id="playPauseButton" iconName={playbackStatus.playbackState === 'playing' ? 'Pause' : 'Play'} onClick={() => playPause()} />
					<PlayerControl id="stepForwardButton" iconName="StepForward" />
					<PlayerControl id="skipForwardButton" iconName="SkipForward" />
				</div>
			</div>
			<div className="control-group">
				<div className="control-subgroup">
					<div className="control-checkbox-container">
						<PlayerToggle id="playLoopToggle" iconName="Infinity" onChange={updateToolSettings} value={toolSettings.playerLoop} toolOption={'playerLoop'} />
					</div>
					<div className="control-radio-group control-radio-subgroup auto-fold">
						<PlayerRadioButtons id="playerSpeedButtonSet" buttonSet={playerSpeedSet} value={toolSettings.playerSpeed} />
					</div>
				</div>
				<div className="control-group">
					<PlayerControl id="settingsButton" iconName="SlidersVertical" />
					<ModalButton id="infoButton" iconName="Info" />
				</div>
			</div>
		</div>
	);
}

export default ControllerBar;
