import React from 'react';

import PlayerControl from '../PlayerControl';
import PlayerSlider from '../PlayerSlider';
import PlayerRadioButtons from '../PlayerRadioButtons';
import ModalButton from '../ModalButton';
import PlayerToggle from '../PlayerToggle/PlayerToggle';
import Icon from '../Icon';

function ControllerBar({ toolSettings, setToolSettings, playbackStatus, leftMedia, rightMedia, setLeftMedia, setRightMedia, PlayerControls }) {

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
			title: 'One-quarter Speed',
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

	return (
		<div id="controllerBar" className={`${toolSettings.controllerBarOptions.floating ? 'floating' : 'docked'} ${(!leftMedia || !rightMedia) ? ' disabled' : ''}`}>
			<PlayerSlider
				id="videoProgressSlider"
				name="Tool Size"
				sliderMinMax={[0, playbackStatus.playbackEndTime]}
				value={playbackStatus.playbackPosition}
				stepValue={0.01}
				onChange={PlayerControls.setCurrentTime}
				useSignificantFigures
			/>
			<div className="control-group">
				<PlayerControl id="swapMediasButton" iconName="Repeat" title="Swap videos" onClick={() => swapMedias()} />
				<PlayerRadioButtons id="toolModeButtonSet" buttonSet={toolModeSet} value={toolSettings.toolMode} />
				<div className="control-subgroup">
					{toolSettings.toolMode === 'divider' && (
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
								id="transitionSpeedSlider"
								name="Transition Speed"
								sliderMinMax={[0.5, 120]}
								value={toolSettings.toolOptions.value[toolSettings.toolMode]}
								stepValue={0.5}
								onChange={updateToolSettingOptionsValue}
								option={toolSettings.toolMode}
								label="/ min"
							/>
						</>
					)}
					{['boxCutout', 'circleCutout'].includes(toolSettings.toolMode) && (
						<PlayerSlider
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
			<div className="control-group">
				<div className="control-subgroup">
					<PlayerControl id="skipBackButton" iconName="SkipBack" onClick={() => PlayerControls.setCurrentTime(0)} />
					<PlayerControl id="stepBackButton" iconName="StepBack" onClick={() => PlayerControls.skip(-0.1)} />
					<PlayerControl id="playPauseButton" iconName={playbackStatus.playbackState === 'playing' ? 'Pause' : 'Play'} onClick={() => PlayerControls.playPause()} />
					<PlayerControl id="stepForwardButton" iconName="StepForward" onClick={() => PlayerControls.skip(0.1)} />
					<PlayerControl id="skipForwardButton" iconName="SkipForward" onClick={() => PlayerControls.setCurrentTime(playbackStatus.playbackEndTime - .1)} />
				</div>
			</div>
			<div className="control-group">
				<div className="control-subgroup">
					<PlayerToggle id="playLoopToggle" iconName="Infinity" onChange={updateToolSettings} value={toolSettings.playerLoop} option="playerLoop" title="Loop Medias" />
					<PlayerRadioButtons id="playerSpeedButtonSet" buttonSet={playerSpeedSet} value={toolSettings.playerSpeed} autoFold />
					{toolSettings.playerSpeed === 8 && (
						<button title="Warning: 8x speed might cause performance issue such as de-sync and frame skipping" disabled>
							<Icon name="TriangleAlert" color="yellow" />
						</button>
					)}
				</div>
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
					{/* <PlayerControl id="settingsButton" iconName="SlidersVertical" title="Settings" className="ignore-disabled"/>
					<ModalButton id="infoButton" iconName="Info" title="About this App" className="ignore-disabled"/> */}
				</div>
			</div>
		</div>
	);
}

export default ControllerBar;
