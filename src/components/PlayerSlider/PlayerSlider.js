import React from 'react';
import Slider from 'rc-slider';
import { timecodeToSeconds } from '../../utils/timecode';
// import Tooltip from 'rc-tooltip';
import 'rc-slider/assets/index.css';

function PlayerSlider({
	defaultSliderValue,
	sliderMinMax = [0, 1],
	value,
	stepValue = 1,
	ticks = null,
	snapToTicks = false,
	snapThreshold = null,
	inputMode = 'auto',
	timecodeFramerate = 30,
	valueParser = null,
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

	const stepValueDecimals = stepValue.toString().split('.')[1] || '';
	const sigFigs = useSignificantFigures ? stepValueDecimals.length : 0;
	const isVertical = direction === 'vertical';

	function getDisplayValue(val) {
		if (valueFormatter) {
			return valueFormatter(val);
		}
		return Number.parseFloat(val).toFixed(sigFigs);
	}

	const [sliderValue, setSliderValue] = React.useState(defaultSliderValue || value);
	const [isDragging, setIsDragging] = React.useState(false);
	const [isEditingInput, setIsEditingInput] = React.useState(false);
	const [inputText, setInputText] = React.useState(() => String(getDisplayValue(defaultSliderValue || value)));
	const inputRef = React.useRef(null);
	const dragStartedRef = React.useRef(false);
	const dragMouseButtonRef = React.useRef(0);

	const sliderWrapperRef = React.useRef(null);

	React.useEffect(() => {
		// Only sync with external value when not dragging or editing text input.
		if (!isDragging && !dragStartedRef.current && !isEditingInput) {
			setSliderValue(value);
		}
	}, [value, isDragging, isEditingInput]);

	React.useEffect(() => {
		if (!isEditingInput) {
			setInputText(String(getDisplayValue(sliderValue)));
		}
	}, [isEditingInput, sliderValue]);

	const normalizedTicks = React.useMemo(() => {
		if (!ticks) return [];
		const raw = Array.isArray(ticks) ? ticks : Object.values(ticks);
		return raw
			.filter(t => t && typeof t === 'object')
			.map(t => ({
				value: Number.parseFloat(t.value),
				title: typeof t.title === 'string' ? t.title : typeof t.label === 'string' ? t.label : '',
			}))
			.filter(t => Number.isFinite(t.value) && t.title)
			.sort((a, b) => a.value - b.value);
	}, [ticks]);

	const effectiveSnapThreshold = React.useMemo(() => {
		if (!snapToTicks) return null;
		if (snapThreshold === null || typeof snapThreshold === 'undefined') {
			const stepAsNumber = Number.parseFloat(stepValue);
			return Number.isFinite(stepAsNumber) ? stepAsNumber / 2 : 0;
		}
		const thresholdAsNumber = Number.parseFloat(snapThreshold);
		return Number.isFinite(thresholdAsNumber) ? thresholdAsNumber : 0;
	}, [snapToTicks, snapThreshold, stepValue]);

	const maybeSnapToTick = React.useCallback(
		(v) => {
			if (!snapToTicks) return v;
			if (!normalizedTicks.length) return v;
			if (!Number.isFinite(v)) return v;
			if (!Number.isFinite(effectiveSnapThreshold) || effectiveSnapThreshold <= 0) return v;

			// Allow users to bypass snap-to-ticks while dragging with the right mouse button.
			if (isDragging && dragMouseButtonRef.current === 2) return v;

			let nearest = normalizedTicks[0];
			let nearestDist = Math.abs(v - nearest.value);
			for (let i = 1; i < normalizedTicks.length; i++) {
				const tick = normalizedTicks[i];
				const dist = Math.abs(v - tick.value);
				if (dist < nearestDist) {
					nearest = tick;
					nearestDist = dist;
				}
			}

			return nearestDist <= effectiveSnapThreshold ? nearest.value : v;
		},
		[effectiveSnapThreshold, isDragging, normalizedTicks, snapToTicks]
	);

	const handleChangeStart = () => {
		dragStartedRef.current = true;
		setIsDragging(true);
		onChangeStart && onChangeStart();
	};

	const handleMouseDownCapture = (e) => {
		// Track which mouse button initiated the drag.
		// 0: left, 1: middle, 2: right
		if (e && typeof e.button === 'number') {
			dragMouseButtonRef.current = e.button;
		}
		// Prevent native context menu interfering with right-drag.
		if (e?.button === 2) {
			e.preventDefault();
		}
	};

	const preventContextMenu = (e) => {
		e.preventDefault();
	};

	const commitValue = React.useCallback(
		(rawValue, { resetDragState = false } = {}) => {
			let nextValue = Number.parseFloat(rawValue);
			if (!Number.isFinite(nextValue)) return;

			nextValue = maybeSnapToTick(nextValue);

			// constrain value to min/max
			if (nextValue < sliderMinMax[0]) nextValue = sliderMinMax[0];
			if (nextValue > sliderMinMax[1]) nextValue = sliderMinMax[1];

			setSliderValue(nextValue);
			onChange && onChange(nextValue, option);
			onChangeComplete && onChangeComplete(nextValue, option);

			if (resetDragState) {
				dragStartedRef.current = false;
				setIsDragging(false);
			}
		},
		[maybeSnapToTick, onChange, onChangeComplete, option, sliderMinMax]
	);

	const resolvedInputMode = React.useMemo(() => {
		if (inputMode && inputMode !== 'auto') return inputMode;
		const sample = String(getDisplayValue(sliderValue));
		return sample.includes(':') ? 'timecode' : 'number';
	}, [inputMode, sliderValue]);

	const percentScale = React.useMemo(() => {
		if (!valueFormatter) return null;
		const formatted = String(valueFormatter(sliderValue) ?? '');
		if (!formatted.includes('%')) return null;

		const formattedAtOne = String(valueFormatter(1) ?? '');
		const n1 = Number.parseFloat(formattedAtOne);
		if (Number.isFinite(n1) && n1 !== 0 && n1 !== 1) return n1;

		const formattedAtHalf = String(valueFormatter(0.5) ?? '');
		const nHalf = Number.parseFloat(formattedAtHalf);
		if (Number.isFinite(nHalf) && nHalf !== 0) return nHalf / 0.5;

		return 100;
	}, [sliderValue, valueFormatter]);

	const parseInputToValue = React.useCallback(
		(text) => {
			if (typeof valueParser === 'function') {
				const parsed = valueParser(text);
				return Number.isFinite(parsed) ? parsed : null;
			}

			const raw = typeof text === 'string' ? text.trim() : String(text ?? '').trim();
			if (!raw) return null;

			if (resolvedInputMode === 'timecode') {
				const seconds = timecodeToSeconds(raw, timecodeFramerate);
				return Number.isFinite(seconds) ? seconds : null;
			}

			let parsed = Number.parseFloat(raw);
			if (!Number.isFinite(parsed)) return null;

			if (percentScale) {
				const hasPercent = raw.includes('%');
				const internalMax = Number.parseFloat(sliderMinMax[1]);
				const shouldScale = hasPercent || (Number.isFinite(internalMax) && parsed > internalMax + 1e-9);
				if (shouldScale) {
					parsed = parsed / percentScale;
				}
			}

			return parsed;
		},
		[percentScale, resolvedInputMode, sliderMinMax, timecodeFramerate, valueParser]
	);

	const handleChangeComplete = v => {
		commitValue(v);
		// Delay resetting isDragging to allow state to propagate
		setTimeout(() => {
			dragStartedRef.current = false;
			dragMouseButtonRef.current = 0;
			setIsDragging(false);
		}, 50);
	};

	const changeValue = v => {
		let nextValue = Number.parseFloat(v);
		if (!Number.isFinite(nextValue)) return;

		// If this is the first change and we haven't started dragging, trigger start
		if (!dragStartedRef.current && !isDragging) {
			dragStartedRef.current = true;
			setIsDragging(true);
			onChangeStart && onChangeStart();
		}

		nextValue = maybeSnapToTick(nextValue);

		// constrain value to min/max
		if (nextValue < sliderMinMax[0]) nextValue = sliderMinMax[0];
		if (nextValue > sliderMinMax[1]) nextValue = sliderMinMax[1];

		setSliderValue(nextValue);
		// With Video.js, no throttling needed - it handles seeking efficiently
		onChange && onChange(nextValue, option);
	};

	const handleTickClick = (tickValue) => {
		// Tick marks should behave like a direct value set (not a drag):
		// commit + propagate to the controlled state.
		dragMouseButtonRef.current = 0;
		commitValue(tickValue, { resetDragState: true });
	};

	const handleSliderDoubleClickCapture = (e) => {
		// Reset to default ONLY when double-clicking the slider handle (dot),
		// so the input behaves like a normal text field.
		const target = e?.target;
		const handleElem = target?.closest?.('.rc-slider-handle');
		if (!handleElem) return;
		commitValue(defaultSliderValue, { resetDragState: true });
		setInputText(String(getDisplayValue(defaultSliderValue)));
	};

	const getTickPercent = (tickValue) => {
		const min = sliderMinMax[0];
		const max = sliderMinMax[1];
		const range = max - min;
		if (!Number.isFinite(range) || range === 0) return 0;
		const pct = ((tickValue - min) / range) * 100;
		return Math.min(100, Math.max(0, pct));
	};

	const commitInputText = React.useCallback(() => {
		const parsed = parseInputToValue(inputText);
		if (parsed === null) {
			setInputText(String(getDisplayValue(sliderValue)));
			return;
		}
		commitValue(parsed, { resetDragState: true });
	}, [commitValue, inputText, parseInputToValue, sliderValue]);

	const getTimecodeSegment = (caretIndex) => {
		// Expected display format: HH:MM:SS.FF (11 chars)
		if (caretIndex <= 2) return { key: 'hh', start: 0, end: 2 };
		if (caretIndex <= 5) return { key: 'mm', start: 3, end: 5 };
		if (caretIndex <= 8) return { key: 'ss', start: 6, end: 8 };
		return { key: 'ff', start: 9, end: 11 };
	};

	const stepInputByArrow = (directionDelta) => {
		const baseValue = parseInputToValue(inputText);
		const current = baseValue === null ? Number.parseFloat(sliderValue) : baseValue;
		if (!Number.isFinite(current)) return;

		if (resolvedInputMode === 'timecode') {
			const caretIndex = inputRef.current?.selectionStart ?? 0;
			const segment = getTimecodeSegment(caretIndex);
			let deltaSeconds = 0;
			if (segment.key === 'hh') deltaSeconds = 3600 * directionDelta;
			if (segment.key === 'mm') deltaSeconds = 60 * directionDelta;
			if (segment.key === 'ss') deltaSeconds = 1 * directionDelta;
			if (segment.key === 'ff') deltaSeconds = (1 / (timecodeFramerate || 30)) * directionDelta;

			const nextSeconds = current + deltaSeconds;
			commitValue(nextSeconds, { resetDragState: true });
			setInputText(String(getDisplayValue(nextSeconds)));
			window.requestAnimationFrame(() => {
				if (inputRef.current) {
					inputRef.current.setSelectionRange(segment.start, segment.end);
				}
			});
			return;
		}

		const stepAsNumber = Number.parseFloat(stepValue);
		if (!Number.isFinite(stepAsNumber) || stepAsNumber === 0) return;
		const nextValue = current + stepAsNumber * directionDelta;
		commitValue(nextValue, { resetDragState: true });
		setInputText(String(getDisplayValue(nextValue)));
	};

	return (
		<div className={['control-slider-container', className].join(' ')} {...props}>
			<div
				ref={sliderWrapperRef}
				className={['player-slider-wrapper', isVertical ? 'is-vertical' : 'is-horizontal'].join(' ')}
				onMouseDownCapture={handleMouseDownCapture}
				onContextMenu={preventContextMenu}
				onDoubleClickCapture={handleSliderDoubleClickCapture}
			>
				<Slider
					min={sliderMinMax[0]}
					max={sliderMinMax[1]}
					step={stepValue}
					value={Number.parseFloat(sliderValue)}
					onChange={v => changeValue(v)}
					onChangeStart={() => handleChangeStart()}
					onChangeComplete={v => handleChangeComplete(v)}
					vertical={isVertical}
				/>
				{!!normalizedTicks.length && (
					<div className={['player-slider-ticks', isVertical ? 'is-vertical' : 'is-horizontal'].join(' ')}>
						{normalizedTicks.map((tick) => {
							const pct = getTickPercent(tick.value);
							const style = isVertical ? { bottom: `${pct}%` } : { left: `${pct}%` };
							return (
								<div
									key={`${tick.value}-${tick.title}`}
									className="player-slider-tick"
									title={tick.title}
									style={style}
									onClick={() => handleTickClick(tick.value)}
									onContextMenu={preventContextMenu}
								/>
							);
						})}
					</div>
				)}
			</div>
			<div className="unit-input-container">
				<input
					min={sliderMinMax[0]}
					max={sliderMinMax[1]}
					type="text"
					ref={inputRef}
					value={inputText}
					onFocus={() => {
						setIsEditingInput(true);
						setInputText(String(getDisplayValue(sliderValue)));
					}}
					onChange={e => {
						setInputText(e.target.value);
					}}
					onBlur={() => {
						commitInputText();
						setIsEditingInput(false);
					}}
					onKeyDown={e => {
						if (e.key === 'Enter') {
							e.preventDefault();
							commitInputText();
							setIsEditingInput(false);
							inputRef.current?.blur();
							return;
						}
						if (e.key === 'Escape') {
							e.preventDefault();
							setInputText(String(getDisplayValue(sliderValue)));
							setIsEditingInput(false);
							inputRef.current?.blur();
							return;
						}
						if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
							e.preventDefault();
							stepInputByArrow(1);
							return;
						}
						if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
							e.preventDefault();
							stepInputByArrow(-1);
							return;
						}
					}}
					title={name}
					style={{ width: `${String(inputText).length}ch` }}
				/>
				{label && <span>{label}</span>}
			</div>
		</div>
	);
}

export default PlayerSlider;
