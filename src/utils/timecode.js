/**
 * Converts seconds to timecode format: HH:MM:SS.ff
 * @param {number} seconds - The time in seconds
 * @param {number} framerate - The framerate of the video (default: 30)
 * @returns {string} Formatted timecode string
 */
export function secondsToTimecode(seconds, framerate = 30) {
	if (isNaN(seconds) || seconds < 0) {
		return '00:00:00.00';
	}

	const totalSeconds = Math.floor(seconds);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const secs = totalSeconds % 60;

	// Calculate frames from the fractional part
	const fractionalSeconds = seconds - totalSeconds;
	const frames = Math.floor(fractionalSeconds * framerate);

	// Format with leading zeros
	const hh = String(hours).padStart(2, '0');
	const mm = String(minutes).padStart(2, '0');
	const ss = String(secs).padStart(2, '0');
	const ff = String(frames).padStart(2, '0');

	return `${hh}:${mm}:${ss}.${ff}`;
}

/**
 * Converts timecode to seconds
 * @param {string} timecode - The timecode string in format HH:MM:SS.ff
 * @param {number} framerate - The framerate of the video (default: 30)
 * @returns {number} Time in seconds
 */
export function timecodeToSeconds(timecode, framerate = 30) {
	const parts = timecode.split(':');
	if (parts.length !== 3) {
		return 0;
	}

	const hours = parseInt(parts[0], 10) || 0;
	const minutes = parseInt(parts[1], 10) || 0;
	const secondsParts = parts[2].split('.');
	const seconds = parseInt(secondsParts[0], 10) || 0;
	const frames = parseInt(secondsParts[1], 10) || 0;

	const totalSeconds = hours * 3600 + minutes * 60 + seconds;
	const frameSeconds = frames / framerate;

	return totalSeconds + frameSeconds;
}
