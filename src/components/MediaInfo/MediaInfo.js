import React from 'react';

function MediaInfo({ mediaData }) {
	console.log('MediaInfo mediaData:', mediaData);
	return (
		<>
			<h4>
				<b>File Name:</b>
				<br />
				{mediaData.mediaMetaData ? mediaData.mediaMetaData.fileName : 'N/A'}
			</h4>
			<h5>
				<br />
				<b>Duration:</b>
				<br />
				{mediaData.mediaMetaData && typeof mediaData.mediaMetaData.duration === 'number' ? `${mediaData.mediaMetaData.duration.toFixed(2)} seconds` : 'N/A'}
				<br />
				<br />
				<b>Resolution:</b>
				<br />
				{mediaData.mediaMetaData && mediaData.mediaMetaData.width && mediaData.mediaMetaData.height
					? `${mediaData.mediaMetaData.width} x ${mediaData.mediaMetaData.height}`
					: 'N/A'}
				<br />
				<br />
				<b>Framerate</b>
				<br />
				{mediaData.mediaMetaData && typeof mediaData.mediaMetaData.framerate === 'number' ? `${mediaData.mediaMetaData.framerate.toFixed(2)} fps` : 'N/A'}
				<br />
				<br />
				<b>File Size:</b>
				<br />
				{mediaData.mediaMetaData && typeof mediaData.mediaMetaData.fileSize === 'number' ? `${(mediaData.mediaMetaData.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'N/A'}
			</h5>
		</>
	);
}

export default MediaInfo;
