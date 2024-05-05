import React from 'react';
import Icon from '../Icon';
import VisuallyHidden from '../VisuallyHidden';

function PlayerRadioButtons({ buttonSet, value }) {
	const groupId = React.useId();

	const [radioValue, setRadioValue] = React.useState(value);

	return (
		<>
			{Object.keys(buttonSet).map(buttonSetItem => {
				const buttonItem = buttonSet[buttonSetItem];

				const elemId = `${buttonItem.name}-${groupId}`;

				const buttonVal = buttonItem.value || buttonItem.name;

				return (
					<label htmlFor={elemId} key={elemId}>
						<input
							type="radio"
							id={elemId}
							name={buttonItem.name}
							value={buttonVal}
							onChange={e => {
								setRadioValue(buttonVal);
								buttonItem.action(buttonVal);
							}}
							title={buttonItem.label}
							checked={radioValue === buttonVal && 'checked'}
						/>
						{buttonItem.icon ? <Icon name={buttonItem.icon} /> : buttonItem.label}
						<VisuallyHidden>{buttonItem.label}</VisuallyHidden>
					</label>
				);
			})}
		</>
	);
}

export default PlayerRadioButtons;
