import React from 'react';

function MediaInfo({ mediaMetaData, mediaType, ...props }) {
    const maxPathLength = 120;

	return (
		<>
			<h4>
				<b>File Name:</b>
				<br />
				{mediaMetaData ? mediaMetaData.fileName : 'N/A'}
			</h4>
			<h5>
				<br />
				<b>File Path:</b>
				<br />
				{mediaMetaData && typeof mediaMetaData.filePath === 'string' ? (mediaMetaData.filePath.length > maxPathLength ? `...${mediaMetaData.filePath.slice(-maxPathLength + 3)}` : mediaMetaData.filePath) : 'N/A'}
				<br />
				<br />
				<b>File Size:</b>
				<br />
				{mediaMetaData && typeof mediaMetaData.fileSize === 'number' ? `${(mediaMetaData.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'N/A'}
				<br />
				<br />
				<b>Resolution:</b>
				<br />
				{mediaMetaData && mediaMetaData.width && mediaMetaData.height
					? `${mediaMetaData.width} x ${mediaMetaData.height}`
					: 'N/A'}
				{mediaType === 'video' && (
					<>
						<br />
						<br />
						<b>Duration:</b>
						<br />
						{mediaMetaData && typeof mediaMetaData.duration === 'number' ? `${mediaMetaData.duration.toFixed(2)} seconds` : 'N/A'}
						<br />
						<br />
						<b>Framerate</b>
						<br />
						{mediaMetaData && typeof mediaMetaData.framerate === 'number' ? `${mediaMetaData.framerate.toFixed(2)} fps` : 'N/A'}
					</>
				)}
			</h5>
		</>
	);
}

export default MediaInfo;
