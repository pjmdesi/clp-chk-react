import React from 'react';

function ImagePlayer({ imageRef, id, onLoad, src, style, imageStyle }) {
	const handleLoad = (e) => {
		if (onLoad) {
			// Create a synthetic event similar to video's loadedmetadata
			const img = e.target;
			onLoad({
				target: {
					id: id,
					naturalWidth: img.naturalWidth,
					naturalHeight: img.naturalHeight,
					width: img.naturalWidth,
					height: img.naturalHeight,
					duration: 0, // Images have no duration
				}
			});
		}
	};

	return (
		<div className="image-player-wrapper" style={style}>
			<img
				ref={imageRef}
				id={id}
				src={src}
				onLoad={handleLoad}
				style={{
					position: 'absolute',
					...imageStyle
				}}
				alt=""
			/>
		</div>
	);
}

export default ImagePlayer;
