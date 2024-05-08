import React from 'react';
import Slider from 'rc-slider';
// import Tooltip from 'rc-tooltip';
import 'rc-slider/assets/index.css';

function PlayerSlider({ defaultSliderValue, sliderValues = [0, 0.5, 1], stepValue = 1, name, onChange, toolOption, label='' }) {

    if (typeof defaultSliderValue === "undefined") {
        defaultSliderValue = Math.min(sliderValues[2], Math.max(sliderValues[0],sliderValues[1]));
    }

    const [sliderValue, setSliderValue] = React.useState(defaultSliderValue || sliderValues[1]);

    const changeValue = (v) => {
        // constrain value to min/max
        if (v < sliderValues[0]) v = sliderValues[0];
        if (v > sliderValues[2]) v = sliderValues[2];

        setSliderValue(v);
        onChange(v, toolOption);
    }

    const handleClick = (e) => {
        e.preventDefault();

        console.log('clicked');
        if (e.detail === 2) {
            console.log('double clicked', defaultSliderValue);
            // double click
            setSliderValue(defaultSliderValue);
            onChange(defaultSliderValue, toolOption);
        }
    }

	return (
		<div className="control-slider-container">
			<Slider min={sliderValues[0]} max={sliderValues[2]} step={stepValue} value={sliderValue} onChange={(v) => changeValue(v)} />
            <div className="unit-input-container">
                <input min={sliderValues[0]} max={sliderValues[2]} type="text" value={sliderValue} onChange={(e) => changeValue(e.target.value)} onClick={handleClick} title={name}/>
                {label && <span>{label}</span>}
            </div>
		</div>
	);
}

export default PlayerSlider;
