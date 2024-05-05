import React from 'react';
import Icon from '../Icon';

function PlayerToggle({ iconName = '', labelText = '', flip = false, value, onChange, toolOption }) {
	return (
		<label>
			<input type="checkbox" onChange={e => onChange(e.target.checked, toolOption)} checked={value}/>
            {flip && labelText}
			{iconName.length > 0 && <Icon name={iconName} />}
			{!flip && labelText}
		</label>
	);
}

export default PlayerToggle;
