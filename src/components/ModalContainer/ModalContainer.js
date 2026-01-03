import React from 'react';
import ModalWindow from '../ModalWindow';

function ModalContainer({ currentModal, setCurrentModal }) {
  const containerRef = React.useRef(null);
  const isOpen = currentModal !== null;

  return (
    <div ref={containerRef} id="modalContainer" className={isOpen ? 'show-modal' : ''} aria-hidden={!isOpen}>
      <div
        className="modal-backdrop"
        onMouseDown={() => {
          if (isOpen) setCurrentModal(null);
        }}
      />
      {isOpen && <ModalWindow currentModal={currentModal} setCurrentModal={setCurrentModal} containerRef={containerRef} />}
    </div>
  );
}

export default ModalContainer;
