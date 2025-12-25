import React from 'react';
import Icon from '../Icon';

function MediaInfoBar({ toolSettings, setToolSettings, mediaSource, setMediaSource, mediaMetaData, mediaType, isInBrowser, openMediaFile, setContainerOverlayInfo, ...props }) {
	return (
		<div className={`media-info ${props.mediaSide}-media-info`}>
			<button className="media-closer" type="button" onClick={() => setMediaSource('')}>
				<Icon name="X" />
			</button>
			<p className="media-label" onClick={!isInBrowser ? () => openMediaFile(mediaSource) : undefined} style={{ cursor: isInBrowser ? 'default' : 'pointer' }}>
				{mediaMetaData ? mediaMetaData.fileName : `${props.mediaSide.charAt(0).toUpperCase() + props.mediaSide.slice(1)} Media`}
			</p>
			{mediaType === 'video' && (
				<button
					className="video-audio-mute"
					type="button"
					onClick={() => {
						const newToolSettings = { ...toolSettings };
						newToolSettings.playerAudio.left.muted = !newToolSettings.playerAudio.left.muted;
						setToolSettings(newToolSettings);
					}}>
					<Icon name={toolSettings.playerAudio.left.muted ? 'VolumeX' : 'Volume2'} color={toolSettings.playerAudio.left.muted ? 'yellow' : 'white'} />
				</button>
			)}
			<button
				className="media-meta-data"
				type="button"
				onClick={() => {
					//! Eventual convert this to use a modal instead of overlay info

					let content = `<h1>${props.mediaSide.charAt(0).toUpperCase() + props.mediaSide.slice(1)} Media Info</h1>`;
					for (const [key, value] of Object.entries(mediaMetaData)) {
						if (mediaType === 'image' && (key === 'duration' || key === 'framerate')) {
							continue; // Skip duration and framerate for images
						}
						const valueText = `${key.charAt(0).toUpperCase() + key.slice(1)}`;
						const unitText = key === 'width' || key === 'height' ? 'px' : key === 'duration' ? 's' : key === 'framerate' ? 'fps' : '';
						content += `<p><strong>${valueText}:</strong>&nbsp;${value}&nbsp;${unitText}</p>`;
					}
					setContainerOverlayInfo(content, true);

					setTimeout(() => {
						setContainerOverlayInfo('', false);
					}, 10000);
				}}>
				<Icon name="Info" />
			</button>
		</div>
	);
}

export default MediaInfoBar;
