import React from 'react';
import Icon from '../Icon';
import MediaInfo from '../MediaInfo';
import PlayerSlider from '../PlayerSlider';

const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

function MediaInfoBar({ toolSettings, setToolSettings, mediaSource, setMediaSource, mediaMetaData, mediaType, mediaSide, isInBrowser, openMediaFile, setCurrentModal, ...props }) {

    const mediaSideLabel = (() => {
        switch (toolSettings.toolMode) {
            case 'divider':
                return mediaSide === 'left' ? 'Left' : 'Right';
            case 'horizontalDivider':
                return mediaSide === 'left' ? 'Top' : 'Bottom';
            case 'circleCutout':
            case 'boxCutout':
                return mediaSide === 'left' ? 'Inside' : 'Outside';
            case 'overlay':
                return mediaSide === 'left' ? 'Foreground' : 'Background';
            default:
                return mediaSide;
        }
    })();

	return (
		<div className={`media-info ${mediaSide}-media-info`}>
			<button className="media-closer" type="button" onClick={() => setMediaSource('')} title={`Close ${capitalize(mediaSide)} Media File`}>
				<Icon name="X" />
			</button>
			<div className="media-label-container">
                <small>{mediaSideLabel}</small>
                <p
                    className="media-label"
                    onClick={!isInBrowser ? () => openMediaFile(mediaSource) : undefined}
                    style={{ cursor: isInBrowser ? 'default' : 'pointer' }}
                    title={`Open ${capitalize(mediaSide)} media file in file browser`}>
                    {mediaMetaData ? mediaMetaData.fileName : `${capitalize(mediaSide)} Media`}
                </p>
            </div>
			{mediaType === 'video' && (
				<>
					<button
						className="video-audio-mute"
						type="button"
						title={`${toolSettings.playerAudio?.[mediaSide === 'right' ? 'right' : 'left']?.muted ? 'Unmute' : 'Mute'} ${capitalize(mediaSide)} Video Audio`}
						onClick={() => {
							const newToolSettings = { ...toolSettings };
							const sideKey = mediaSide === 'right' ? 'right' : 'left';
							newToolSettings.playerAudio[sideKey].muted = !newToolSettings.playerAudio[sideKey].muted;
							setToolSettings(newToolSettings);
						}}>
						{(() => {
							const sideKey = mediaSide === 'right' ? 'right' : 'left';
							const isMuted = toolSettings.playerAudio?.[sideKey]?.muted;
                            const volume = toolSettings.playerAudio?.[sideKey]?.volume;
							return <Icon name={isMuted ? 'VolumeX' : volume < 1 ? 'Volume1' : 'Volume2'} color={isMuted ? 'yellow' : 'white'} />;
						})()}
					</button>
					{!toolSettings.playerAudio?.[mediaSide === 'right' ? 'right' : 'left']?.muted && (
						<PlayerSlider
							value={toolSettings.playerAudio?.[mediaSide === 'right' ? 'right' : 'left']?.volume || 1}
							onChange={newVolume => {
								const newToolSettings = { ...toolSettings };
								const sideKey = mediaSide === 'right' ? 'right' : 'left';
								newToolSettings.playerAudio[sideKey].volume = newVolume;
								setToolSettings(newToolSettings);
							}}
							sliderMinMax={[0,2]}
							stepValue={0.01}
                            useSignificantFigures={2}
                            valueFormatter={vol => `${Math.round(vol * 100)}%`}
                            defaultSliderValue={1}
                            snapThreshold={0.05}
                            snapToTicks={true}
                            ticks={{
                                default: {
                                    value: 1,
                                    title: '100%',
                                }
                            }}
                            className="video-audio-volume-slider"
							title={`${capitalize(mediaSide)} Video Audio Volume`}
						/>
					)}
				</>
			)}
			<button
				className="media-info-button"
				title={`Open ${capitalize(mediaSide)} ${capitalize(mediaType)} Info`}
				onClick={() => {
					if (!setCurrentModal) {
						return;
					}

					setCurrentModal({
						key: 'mediaInfo',
						title: `${capitalize(mediaSide)} ${capitalize(mediaType)} Info`,
						component: MediaInfo,
						props: {
							mediaData: {
								mediaMetaData: mediaMetaData,
								mediaType: mediaType,
								mediaSide: mediaSide,
							},
						},
					});
				}}>
				<Icon name="Info" />
			</button>
		</div>
	);
}

export default MediaInfoBar;
