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
					const durationText = leftMediaType === 'video' ? `<p>Duration: ${leftMediaMetaData.duration.toFixed(2)}s</p>` : '';
					const content = `<h3>Left Media Info</h3><h6><small>Source: ${leftMedia}</small></h6>${durationText}<p>Width: ${leftMediaMetaData.width}px</p><p>Height: ${leftMediaMetaData.height}px</p>`;
					setContainerOverlayInfo(content, true);
				}}>
				<Icon name="Info" />
			</button>
		</div>
	);
}

export default MediaInfoBar;
