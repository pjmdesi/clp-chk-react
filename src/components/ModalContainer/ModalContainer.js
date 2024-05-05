import React from 'react';
import ModalWindow from '../ModalWindow';

function ModalContainer({ currentModal, setCurrentModal }) {
  return <div id="modalContainer">
    <ModalWindow currentModal={currentModal} setCurrentModal={setCurrentModal} />
  </div>;
}

export default ModalContainer;
