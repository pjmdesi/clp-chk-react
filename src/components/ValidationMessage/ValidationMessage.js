import React from 'react';
import Icon from '../Icon';

function ValidationMessage({ messages, setMessages }) {
    const [severityColors] = React.useState({
        error: 'pink',
        warning: 'caution',
        info: 'info',
    });
	return (
		<div id="validationMessage" className={`validation-message ${messages.some(w => w.severity === 'error') ? 'has-error' : ''}`}>
			{messages.map((warning, index) => (
				<div key={index} className={`validation-warning ${warning.severity}`}>
					<Icon name={warning.severity === 'error' ? 'OctagonX' : warning.severity === 'warning' ? 'TriangleAlert' : 'Info'} size={24}
                    color={`var(--${severityColors[warning.severity]})`} />
					<span>{warning.message}</span>
                    <button className="validation-closer" onClick={() => {
                        // Close the validation message
                        const newMessages = messages.filter((_, i) => i !== index);
                        setMessages(newMessages);
                    }}>
                        <Icon name="X" />
                    </button>
				</div>
			))}
		</div>
	);
}

export default ValidationMessage;
