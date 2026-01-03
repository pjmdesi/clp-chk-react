// Defines which settings are user-editable and how to render them.
// Add/remove items here to change what appears in the Settings modal.

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Avoid zero-range zoom which breaks snapping/slider mapping.
const MIN_ZOOM_SPAN = 0.05;

export const userSettingsSections = [
	{
		id: 'zoom',
		title: 'Zoom',
		items: [
			{
				scope: 'tool',
				key: 'zoomSpeed',
				type: 'number',
				control: 'slider',
				label: 'Scroll zoom speed',
				min: 0.005,
				max: 0.2,
				step: 0.005,
				unit: '/tick',
				format: v => `${Number(v).toFixed(3)}`,
			},
			{
				scope: 'app',
				key: 'zoomMin',
				type: 'number',
				control: 'slider',
				label: 'Minimum zoom',
				min: 0.01,
				max: 1,
				step: 0.05,
				unit: 'x',
				format: v => `${Number(v).toFixed(2)}`,
			},
			{
				scope: 'app',
				key: 'zoomMax',
				type: 'number',
				control: 'slider',
				label: 'Maximum zoom',
				min: 1,
				max: 20,
				step: 0.05,
				unit: 'x',
				format: v => `${Number(v).toFixed(2)}`,
			},
			{
				scope: 'tool',
				key: 'invertZoomDirection',
				type: 'boolean',
				control: 'toggle',
				label: 'Invert zoom direction',
			},
		],
	},
	{
		id: 'scroll',
		title: 'Scroll',
		items: [
			{
				scope: 'tool',
				key: 'swapScrollDirections',
				type: 'boolean',
				control: 'toggle',
				label: 'Swap scroll directions',
			},
		],
	},
];

export function getZoomBounds(toolSettings, appSettings) {
	const fallbackMin = typeof toolSettings?.zoomMin === 'number' ? toolSettings.zoomMin : 0.25;
	const fallbackMax = typeof toolSettings?.zoomMax === 'number' ? toolSettings.zoomMax : 6;

	const zoomMin = typeof appSettings?.zoomMin === 'number' ? appSettings.zoomMin : fallbackMin;
	const zoomMax = typeof appSettings?.zoomMax === 'number' ? appSettings.zoomMax : fallbackMax;

	return { zoomMin, zoomMax };
}

export function sanitizeAppSettings(nextAppSettings, lastChangedKey = null) {
	if (!nextAppSettings || typeof nextAppSettings !== 'object') return nextAppSettings;

	const hasZoomBounds = typeof nextAppSettings.zoomMin !== 'undefined' || typeof nextAppSettings.zoomMax !== 'undefined';
	if (!hasZoomBounds) return nextAppSettings;

	let zoomMin = typeof nextAppSettings.zoomMin === 'number' ? nextAppSettings.zoomMin : 0.25;
	let zoomMax = typeof nextAppSettings.zoomMax === 'number' ? nextAppSettings.zoomMax : 6;

	zoomMin = clamp(zoomMin, 0.01, 1);
	zoomMax = clamp(zoomMax, 1, 20);

	if (zoomMin > zoomMax) {
		if (lastChangedKey === 'zoomMin') zoomMax = zoomMin;
		else if (lastChangedKey === 'zoomMax') zoomMin = zoomMax;
		else zoomMax = zoomMin;
	}

	if (zoomMax - zoomMin < MIN_ZOOM_SPAN) {
		if (lastChangedKey === 'zoomMin') {
			zoomMax = clamp(zoomMin + MIN_ZOOM_SPAN, 1, 20);
			zoomMin = clamp(Math.min(zoomMin, zoomMax - MIN_ZOOM_SPAN), 0.01, 1);
		} else {
			zoomMin = clamp(Math.min(zoomMin, zoomMax - MIN_ZOOM_SPAN), 0.01, 1);
			zoomMax = clamp(Math.max(zoomMax, zoomMin + MIN_ZOOM_SPAN), 1, 20);
		}
	}

	return {
		...nextAppSettings,
		zoomMin,
		zoomMax,
	};
}

export function clampToolZoomScale(toolSettings, appSettings) {
	if (!toolSettings || typeof toolSettings !== 'object') return toolSettings;
	const { zoomMin, zoomMax } = getZoomBounds(toolSettings, appSettings);
	const zoomScale = typeof toolSettings.zoomScale === 'number' ? toolSettings.zoomScale : 1;
	return {
		...toolSettings,
		zoomScale: clamp(zoomScale, zoomMin, zoomMax),
	};
}
