import React from 'react';
import Slider from 'rc-slider';
// import Tooltip from 'rc-tooltip';
import 'rc-slider/assets/index.css';

function PlayerSlider({
	defaultSliderValue,
	sliderMinMax = [0, 1],
	value,
	stepValue = 1,
	name,
	onChange,
	onChangeStart = null,
	onChangeComplete = null,
	option = null,
	label = '',
	useSignificantFigures,
	direction,
	valueFormatter = null,
    className = '',
	...props
}) {
	if (typeof defaultSliderValue === 'undefined') {
		defaultSliderValue = Math.min(sliderMinMax[1], Math.max(sliderMinMax[0], value));
	}

	const [sliderValue, setSliderValue] = React.useState(defaultSliderValue || value);
	const [isDragging, setIsDragging] = React.useState(false);
	const dragStartedRef = React.useRef(false);

	React.useEffect(() => {
		// Only sync with external value when not dragging
		if (!isDragging && !dragStartedRef.current) {
			setSliderValue(value);
		}
	}, [value, isDragging]);

	const sigFigs = useSignificantFigures ? stepValue.toString().split('.')[1].length : 0;

	const handleChangeStart = () => {
		dragStartedRef.current = true;
		setIsDragging(true);
		onChangeStart && onChangeStart();
	};

	const handleChangeComplete = v => {
		// Update local state with final value
		setSliderValue(v);
		// Call onChange to commit the final value
		onChange && onChange(v, option);
		// Call onChangeComplete callback
		onChangeComplete && onChangeComplete(v, option);
		// Delay resetting isDragging to allow state to propagate
		setTimeout(() => {
			dragStartedRef.current = false;
			setIsDragging(false);
		}, 50);
	};

	const changeValue = v => {
		// If this is the first change and we haven't started dragging, trigger start
		if (!dragStartedRef.current && !isDragging) {
			dragStartedRef.current = true;
			setIsDragging(true);
			onChangeStart && onChangeStart();
		}

		// constrain value to min/max
		if (v < sliderMinMax[0]) v = sliderMinMax[0];
		if (v > sliderMinMax[1]) v = sliderMinMax[1];

		setSliderValue(v);
		// With Video.js, no throttling needed - it handles seeking efficiently
		onChange && onChange(v, option);
	};

	const handleInputClick = e => {
		e.preventDefault();

		if (e.detail === 2) {
			// double click
			setSliderValue(defaultSliderValue);
			onChange(defaultSliderValue, option);
		}
	};

	// Format the display value
	const getDisplayValue = (val) => {
		if (valueFormatter) {
			return valueFormatter(val);
		}
		return val.toFixed(sigFigs);
	};

	return (
		<div className={['control-slider-container', className].join(' ')} {...props}>
			<Slider
				min={sliderMinMax[0]}
				max={sliderMinMax[1]}
				step={stepValue}
				value={parseFloat(sliderValue)}
				onChange={v => changeValue(v)}
				onChangeStart={() => handleChangeStart()}
				onChangeComplete={v => handleChangeComplete(v)}
                vertical={direction === 'vertical'}
			/>
			<div className="unit-input-container">
				<input
					min={sliderMinMax[0]}
					max={sliderMinMax[1]}
					type="text"
					value={getDisplayValue(sliderValue)}
					onChange={e => changeValue(e.target.value)}
					onClick={handleInputClick}
					title={name}
					style={{ width: `${getDisplayValue(sliderValue).length}ch` }}
				/>
				{label && <span>{label}</span>}
			</div>
		</div>
	);
}

export default PlayerSlider;
