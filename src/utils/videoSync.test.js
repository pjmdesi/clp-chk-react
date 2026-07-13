import { describe, it, expect } from 'vitest';
import { getSlaveTarget } from './videoSync';

describe('getSlaveTarget', () => {
	it('maps master time directly when there is no offset', () => {
		expect(getSlaveTarget(5, 10, 0)).toEqual({ time: 5, state: 'active' });
	});

	it('shifts by the offset while active', () => {
		expect(getSlaveTarget(7, 10, 5)).toEqual({ time: 2, state: 'active' });
	});

	it('freezes on frame 0 before the slave window starts', () => {
		expect(getSlaveTarget(3, 10, 5)).toEqual({ time: 0, state: 'before' });
	});

	it('freezes on the last frame after the slave window ends', () => {
		expect(getSlaveTarget(16, 10, 5)).toEqual({ time: 10, state: 'after' });
	});

	it('treats the exact end boundary as after (t >= duration)', () => {
		expect(getSlaveTarget(15, 10, 5)).toEqual({ time: 10, state: 'after' });
	});

	it('treats the exact start boundary as active (t = 0)', () => {
		expect(getSlaveTarget(5, 10, 5)).toEqual({ time: 0, state: 'active' });
	});

	it('is invalid when the slave duration is missing or unusable', () => {
		expect(getSlaveTarget(5, 0, 0)).toEqual({ time: 5, state: 'invalid' });
		expect(getSlaveTarget(5, NaN, 0)).toEqual({ time: 5, state: 'invalid' });
		expect(getSlaveTarget(5, undefined, 0)).toEqual({ time: 5, state: 'invalid' });
		expect(getSlaveTarget(5, -1, 0)).toEqual({ time: 5, state: 'invalid' });
	});

	it('treats a non-finite offset as 0', () => {
		expect(getSlaveTarget(5, 10, NaN)).toEqual({ time: 5, state: 'active' });
		expect(getSlaveTarget(5, 10, undefined)).toEqual({ time: 5, state: 'active' });
	});
});
