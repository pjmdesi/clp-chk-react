import React from 'react';
import Icon from '../Icon';
import VisuallyHidden from '../VisuallyHidden';

function PlayerRadioButtons({ buttonSet, value, autoFold = false, ...props}) {
	const groupId = React.useId();

	const [radioValue, setRadioValue] = React.useState(value);

	return (
        <div className={`control-radio-group${autoFold?' auto-fold':''}`}>
			{Object.keys(buttonSet).map(buttonSetItem => {
				const buttonItem = buttonSet[buttonSetItem];

				const elemId = `${buttonItem.name}-${groupId}`;
				const buttonVal = buttonItem.value || buttonItem.name;
                const buttonTitle = buttonItem.title || buttonItem.label;

				return (
					<label htmlFor={elemId} key={elemId} title={buttonTitle} {...props}>
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
		</div>
	);
}

export default PlayerRadioButtons;
