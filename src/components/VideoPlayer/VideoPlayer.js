import React from 'react';

function VideoPlayer({ id, video }) {
	return (
		<video id={id} muted>
			<source src={video} />
		</video>
	);
}

export default VideoPlayer;