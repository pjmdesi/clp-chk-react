// Pure timeline math for the master/slave video sync engine.
// Extracted from MediaContainer so the window mapping is unit-testable.

// Maps a master-timeline time T to where the slave should sit, given its duration
// and the current offset. State is 'before' (slave hasn't started yet — freeze on
// frame 0), 'active' (slave is playing within its range), or 'after' (slave has
// ended — freeze on last frame). 'invalid' means we couldn't compute (missing dur).
export const getSlaveTarget = (masterTime, slaveDuration, offset) => {
	if (typeof slaveDuration !== 'number' || !Number.isFinite(slaveDuration) || slaveDuration <= 0) {
		return { time: masterTime, state: 'invalid' };
	}
	const t = masterTime - (typeof offset === 'number' && Number.isFinite(offset) ? offset : 0);
	if (t < 0) return { time: 0, state: 'before' };
	if (t >= slaveDuration) return { time: slaveDuration, state: 'after' };
	return { time: t, state: 'active' };
};
