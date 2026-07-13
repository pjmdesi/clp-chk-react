// Pure helpers for merging saved (localStorage) settings with shipped defaults.
// Extracted from MainContainer so the migration behavior is unit-testable.

export const isPlainObject = value => {
	return !!value && typeof value === 'object' && !Array.isArray(value);
};

export const tryParseJsonObject = value => {
	if (typeof value !== 'string' || !value.trim()) return null;
	try {
		const parsed = JSON.parse(value);
		return isPlainObject(parsed) ? parsed : null;
	} catch {
		return null;
	}
};

export const tryCoerceNumberString = value => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (!trimmed) return null;

	// Strict numeric string: integer/float with optional exponent.
	// Examples allowed: "10", "-3.5", ".25", "1e3", "-2.1E-2"
	const numericPattern = /^[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[-+]?\d+)?$/i;
	if (!numericPattern.test(trimmed)) return null;

	const num = Number(trimmed);
	return Number.isFinite(num) ? num : null;
};

// Deep-merge: keep user's existing values when compatible; fill any missing/new keys from defaults.
// Also retains any extra keys the user may already have.
export const mergeWithDefaults = (defaults, saved) => {
	if (!isPlainObject(defaults)) {
		return { merged: saved ?? defaults, changed: saved !== defaults };
	}

	const safeSaved = isPlainObject(saved) ? saved : {};
	let changed = false;
	const merged = {};

	for (const key of Object.keys(defaults)) {
		const defaultValue = defaults[key];
		const hasSavedKey = Object.prototype.hasOwnProperty.call(safeSaved, key);

		if (!hasSavedKey) {
			merged[key] = defaultValue;
			changed = true;
			continue;
		}

		const savedValue = safeSaved[key];

		if (isPlainObject(defaultValue) && isPlainObject(savedValue)) {
			const { merged: childMerged, changed: childChanged } = mergeWithDefaults(defaultValue, savedValue);
			merged[key] = childMerged;
			if (childChanged) changed = true;
			continue;
		}

		// Strict: preserve only when types match.
		// Special-case: when default expects a number, allow numeric strings ("100", "0.8").
		if (typeof defaultValue === 'number') {
			if (typeof savedValue === 'number') {
				merged[key] = savedValue;
			} else {
				const coerced = tryCoerceNumberString(savedValue);
				if (coerced !== null) {
					merged[key] = coerced;
					changed = true;
				} else {
					merged[key] = defaultValue;
					changed = true;
				}
			}
			continue;
		}

		if (typeof savedValue === typeof defaultValue) {
			merged[key] = savedValue;
		} else {
			merged[key] = defaultValue;
			changed = true;
		}
	}

	// Keep any unknown keys (forward/backward compatibility)
	for (const key of Object.keys(safeSaved)) {
		if (!Object.prototype.hasOwnProperty.call(defaults, key)) {
			merged[key] = safeSaved[key];
		}
	}

	return { merged, changed };
};
