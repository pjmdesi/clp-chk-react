import React from 'react';
import Slider from 'rc-slider';
// import Tooltip from 'rc-tooltip';
import 'rc-slider/assets/index.css';

function PlayerSlider({ defaultSliderValue, sliderMinMax = [0, 1], value, stepValue = 1, name, onChange, onBeforeChange = null, option=null, label='', useSignificantFigures, ...props }) {

    if (typeof defaultSliderValue === "undefined") {
        defaultSliderValue = Math.min(sliderMinMax[1], Math.max(sliderMinMax[0],value));
    }

    const [sliderValue, setSliderValue] = React.useState(defaultSliderValue || value);

    React.useEffect(() => {
        setSliderValue(value);
    }, [value]);

    const sigFigs = useSignificantFigures ? stepValue.toString().split('.')[1].length : 0;

    const handleBeforeChange = () => {
        onBeforeChange && onBeforeChange();
    }

    const changeValue = (v) => {
        // constrain value to min/max
        if (v < sliderMinMax[0]) v = sliderMinMax[0];
        if (v > sliderMinMax[1]) v = sliderMinMax[1];

        setSliderValue(v);
        onChange(v, option);
    }

    const handleInputClick = (e) => {
        e.preventDefault();

        if (e.detail === 2) {
            console.log('double clicked', defaultSliderValue);
            // double click
            setSliderValue(defaultSliderValue);
            onChange(defaultSliderValue, option);
        }
    }

	return (
		<div className="control-slider-container" {...props}>
			<Slider min={sliderMinMax[0]} max={sliderMinMax[1]} step={stepValue} value={sliderValue.toFixed(sigFigs)} onChange={(v) => changeValue(v)} onBeforeChange={() => handleBeforeChange()} />
            <div className="unit-input-container">
                <input min={sliderMinMax[0]} max={sliderMinMax[1]} type="text" value={sliderValue.toFixed(sigFigs)} onChange={(e) => changeValue(e.target.value)} onClick={handleInputClick} title={name} style={{width: `${sliderValue.toFixed(sigFigs).length}ch`}}/>
                {label && <span>{label}</span>}
            </div>
		</div>
	);
}

export default PlayerSlider;
