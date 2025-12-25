import React from 'react';
import Icon from '../Icon';

function ClipperLock({ id, locked }) {
	return (
		<div id={id} className={`${locked ? 'locked' : 'unlocked'}`}>
			<Icon name={locked ? 'Lock' : 'LockOpen'} color={locked ? 'var(--orange)' : 'var(--white)'} />
		</div>
	);
}

export default ClipperLock;
