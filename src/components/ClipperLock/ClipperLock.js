import React from 'react';
import Icon from '../Icon';

function ClipperLock({ id, locked }) {
	return (
		<div id={id} className={`${locked ? 'locked' : 'unlocked'}`}>
			<Icon size={20} name={locked ? 'Lock' : 'LockOpen'} color={locked ? 'var(--prime)' : 'var(--white)'} />
		</div>
	);
}

export default ClipperLock;
