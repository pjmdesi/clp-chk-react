import { describe, it, expect } from 'vitest';
import { secondsToTimecode, timecodeToSeconds } from './timecode';

describe('secondsToTimecode', () => {
	it('formats zero', () => {
		expect(secondsToTimecode(0)).toBe('00:00:00.00');
	});

	it('formats hours, minutes, seconds, and frames', () => {
		expect(secondsToTimecode(3661 + 15 / 30, 30)).toBe('01:01:01.15');
	});

	it('rolls a frame that rounds up to fps into the seconds field', () => {
		// 0.9999s at 30fps rounds to frame 30, which must become 1s + frame 0,
		// not the invalid 00:00:00.30. (Regression: fixed in bebfb5d.)
		expect(secondsToTimecode(0.9999, 30)).toBe('00:00:01.00');
	});

	it('returns zero timecode for invalid input', () => {
		expect(secondsToTimecode(NaN)).toBe('00:00:00.00');
		expect(secondsToTimecode(-5)).toBe('00:00:00.00');
	});

	it('falls back to 30fps when framerate is invalid', () => {
		expect(secondsToTimecode(1.5, 0)).toBe('00:00:01.15');
		expect(secondsToTimecode(1.5, NaN)).toBe('00:00:01.15');
	});

	it('pads all fields to two digits', () => {
		expect(secondsToTimecode(7 + 3 / 30, 30)).toBe('00:00:07.03');
	});
});

describe('timecodeToSeconds', () => {
	it('parses HH:MM:SS.ff', () => {
		expect(timecodeToSeconds('01:01:01.15', 30)).toBeCloseTo(3661.5, 5);
	});

	it('returns 0 for malformed input', () => {
		expect(timecodeToSeconds('nope')).toBe(0);
		expect(timecodeToSeconds('1:2')).toBe(0);
	});

	it('treats a missing frame field as frame 0', () => {
		expect(timecodeToSeconds('00:00:05', 30)).toBe(5);
	});

	it('round-trips with secondsToTimecode at frame precision', () => {
		const fps = 24;
		const s = 123 + 7 / fps;
		expect(timecodeToSeconds(secondsToTimecode(s, fps), fps)).toBeCloseTo(s, 5);
	});
});
