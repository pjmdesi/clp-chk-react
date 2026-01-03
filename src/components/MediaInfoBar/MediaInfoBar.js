import React from 'react';
import Icon from '../Icon';
import MediaInfo from '../MediaInfo'

function MediaInfoBar({ toolSettings, setToolSettings, mediaSource, setMediaSource, mediaMetaData, mediaType, mediaSide, isInBrowser, openMediaFile, setCurrentModal, ...props }) {
	return (
		<div className={`media-info ${mediaSide}-media-info`}>
			<button className="media-closer" type="button" onClick={() => setMediaSource('')}>
				<Icon name="X" />
			</button>
			<p className="media-label" onClick={!isInBrowser ? () => openMediaFile(mediaSource) : undefined} style={{ cursor: isInBrowser ? 'default' : 'pointer' }}>
				{mediaMetaData ? mediaMetaData.fileName : `${mediaSide.charAt(0).toUpperCase() + mediaSide.slice(1)} Media`}
			</p>
			{mediaType === 'video' && (
				<button
					className="video-audio-mute"
					type="button"
					onClick={() => {
						const newToolSettings = { ...toolSettings };
						const sideKey = mediaSide === 'right' ? 'right' : 'left';
						newToolSettings.playerAudio[sideKey].muted = !newToolSettings.playerAudio[sideKey].muted;
						setToolSettings(newToolSettings);
					}}>
					{(() => {
						const sideKey = mediaSide === 'right' ? 'right' : 'left';
						const isMuted = toolSettings.playerAudio?.[sideKey]?.muted;
						return <Icon name={isMuted ? 'VolumeX' : 'Volume2'} color={isMuted ? 'yellow' : 'white'} />;
					})()}
				</button>
			)}
			<button
                className="media-info-button"
				title="Open Media Info"
				onClick={() => {
					if (!setCurrentModal) {
						return;
					}

					setCurrentModal({
						key: 'mediaInfo',
						title: `${mediaSide.charAt(0).toUpperCase() + mediaSide.slice(1)} ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} Info`,
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
