import React from 'react';
import '../../styles.scss';

import MainContainer from '../MainContainer';

function App() {
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
		</>
	);
}

export default App;
