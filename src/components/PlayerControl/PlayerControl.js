import React from 'react';

import Icon from '../Icon';

function PlayerControl({ iconName = '', labelText = '', flip = false, type = 'button', ...props }) {
	return (
        <button type={type} {...props} className="player-control">
			{flip && labelText}
			{iconName.length > 0 && <Icon name={iconName} />}
			{!flip && labelText}
		</button>
	);
}

export default PlayerControl;
