import { describe, it, expect } from 'vitest';
import { getZoomBounds, sanitizeAppSettings, clampToolZoomScale } from './userSettingsSchema';

describe('getZoomBounds', () => {
	it('prefers appSettings bounds', () => {
		expect(getZoomBounds({ zoomMin: 0.1, zoomMax: 2 }, { zoomMin: 0.5, zoomMax: 4 })).toEqual({ zoomMin: 0.5, zoomMax: 4 });
	});

	it('falls back to legacy toolSettings bounds', () => {
		expect(getZoomBounds({ zoomMin: 0.1, zoomMax: 2 }, {})).toEqual({ zoomMin: 0.1, zoomMax: 2 });
	});

	it('falls back to hardcoded defaults when neither has bounds', () => {
		expect(getZoomBounds({}, {})).toEqual({ zoomMin: 0.25, zoomMax: 6 });
	});
});

describe('sanitizeAppSettings', () => {
	it('passes through settings without zoom bounds untouched', () => {
		const settings = { showTooltips: true };
		expect(sanitizeAppSettings(settings)).toBe(settings);
	});

	it('keeps valid bounds as-is', () => {
		expect(sanitizeAppSettings({ zoomMin: 0.5, zoomMax: 6 })).toEqual({ zoomMin: 0.5, zoomMax: 6 });
	});

	it('clamps bounds into their allowed ranges', () => {
		const out = sanitizeAppSettings({ zoomMin: -1, zoomMax: 100 });
		expect(out.zoomMin).toBe(0.01);
		expect(out.zoomMax).toBe(20);
	});

	it('resolves min > max in favor of the last-changed key', () => {
		// User dragged zoomMin above zoomMax: max follows min.
		const out = sanitizeAppSettings({ zoomMin: 1, zoomMax: 1 }, 'zoomMin');
		expect(out.zoomMax).toBeGreaterThanOrEqual(out.zoomMin);
	});

	it('enforces the minimum zoom span', () => {
		const out = sanitizeAppSettings({ zoomMin: 1, zoomMax: 1 });
		expect(out.zoomMax - out.zoomMin).toBeGreaterThanOrEqual(0.05);
	});

	it('fills missing bound with its default before clamping', () => {
		const out = sanitizeAppSettings({ zoomMin: 0.5 });
		expect(out.zoomMin).toBe(0.5);
		expect(out.zoomMax).toBe(6);
	});
});

describe('clampToolZoomScale', () => {
	it('clamps zoomScale into the app bounds', () => {
		expect(clampToolZoomScale({ zoomScale: 50 }, { zoomMin: 0.25, zoomMax: 6 }).zoomScale).toBe(6);
		expect(clampToolZoomScale({ zoomScale: 0.01 }, { zoomMin: 0.25, zoomMax: 6 }).zoomScale).toBe(0.25);
	});

	it('leaves in-range zoomScale unchanged', () => {
		expect(clampToolZoomScale({ zoomScale: 1.5 }, { zoomMin: 0.25, zoomMax: 6 }).zoomScale).toBe(1.5);
	});

	it('defaults a non-numeric zoomScale to 1 (then clamps)', () => {
		expect(clampToolZoomScale({ zoomScale: 'huge' }, { zoomMin: 0.25, zoomMax: 6 }).zoomScale).toBe(1);
		expect(clampToolZoomScale({}, { zoomMin: 2, zoomMax: 6 }).zoomScale).toBe(2);
	});
});
