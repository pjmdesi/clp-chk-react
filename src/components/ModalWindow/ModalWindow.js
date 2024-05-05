import { Info } from 'lucide-react';
import React from 'react';

const modalSwitch = modal => {
	switch (modal) {
		case 'info':
			return <infoModalWindow />;
		default:
			return null;
	}
};

function infoModalWindow() {
	return (
		<div id="infoModalWIndow">
			<div id="infoModalHeader">
				<h1>Info</h1>
				<button>Close</button>
			</div>
			<div id="infoModalBody">
				<p>Some information</p>
			</div>
		</div>
	);
}

function ModalWindow({ currentModal, setCurrentModal }) {
	return <div id="modalWindow">{modalSwitch(currentModal)}</div>;
}

export default ModalWindow;
