import React from 'react';
import '../../styles.scss';

import MainContainer from '../MainContainer';
import ModalContainer from '../ModalContainer';

function App() {
    const [currentModal, setCurrentModal] = React.useState(null);

	return (
		<>
			<MainContainer />
			{currentModal && <ModalContainer currentModal={currentModal} setCurrentModal={setCurrentModal} />}
		</>
	);
}

export default App;
