import React from 'react';
import Icon from '../Icon';

function VideoFileInput( { setVideoFile } ) {

    const setVideoFileFromInput = (filepath) => {
        console.log(filepath);
        setVideoFile(filepath);
    }

	return (
		<>
			<label className="file-input">
				<Icon name="FileVideo" className="input-icon" size={48} />
				<Icon name="FileImage" className="input-icon" size={48} />
				<span>Pick a file or drag&nbsp;here</span>
				<input type="file" accept="video/*" onChange={e => setVideoFileFromInput(e.target.files[0].path)}  />
			</label>
		</>
	);
}

export default VideoFileInput;
