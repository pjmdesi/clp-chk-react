import React from 'react';
import Icon from '../Icon';

function ModalButton({ iconName = '', label = '', flip = false}) {
	return (
		<button>
			{flip && label}
			{iconName.length > 0 && <Icon name={iconName} />}
			{!flip && label}
		</button>
	);
}

export default ModalButton;
