import React from 'react';
import '../../styles.scss';

import MainContainer from '../MainContainer';
import ModalContainer from '../ModalContainer';

function App() {
    const [currentModal, setCurrentModal] = React.useState(null);

    const logAllEvents = () => {
        Object.keys(window).forEach(key => {
            if(/./.test(key)){
                window.addEventListener(key.slice(2), event => {
                    console.log(key, event)
                })
            }
        })
    }

    React.useEffect(() => {
        // logAllEvents()
    } ,[]);

	return (
		<>
			<MainContainer />
			{currentModal && <ModalContainer currentModal={currentModal} setCurrentModal={setCurrentModal} />}
		</>
	);
}

export default App;
