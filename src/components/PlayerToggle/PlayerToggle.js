import React from 'react';
import Icon from '../Icon';

function PlayerToggle({ iconName = '', labelText = '', flip = false, value, onChange, option, ...props }) {
	return (
		<div className="control-checkbox-container">
			<label {...props}>
				<input type="checkbox" onChange={e => onChange(e.target.checked, option)} checked={value} />
				{flip && labelText}
				{iconName.length > 0 && <Icon name={iconName} />}
				{!flip && labelText}
			</label>
		</div>
	);
}

export default PlayerToggle;
