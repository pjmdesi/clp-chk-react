import { describe, it, expect } from 'vitest';
import { isPlainObject, tryParseJsonObject, tryCoerceNumberString, mergeWithDefaults } from './settingsMerge';

describe('isPlainObject', () => {
	it('accepts plain objects only', () => {
		expect(isPlainObject({})).toBe(true);
		expect(isPlainObject({ a: 1 })).toBe(true);
		expect(isPlainObject([])).toBe(false);
		expect(isPlainObject(null)).toBe(false);
		expect(isPlainObject('str')).toBe(false);
		expect(isPlainObject(42)).toBe(false);
	});
});

describe('tryParseJsonObject', () => {
	it('parses a JSON object string', () => {
		expect(tryParseJsonObject('{"a":1}')).toEqual({ a: 1 });
	});

	it('rejects non-object JSON and garbage', () => {
		expect(tryParseJsonObject('[1,2]')).toBeNull();
		expect(tryParseJsonObject('"str"')).toBeNull();
		expect(tryParseJsonObject('not json')).toBeNull();
		expect(tryParseJsonObject('')).toBeNull();
		expect(tryParseJsonObject(null)).toBeNull();
	});
});

describe('tryCoerceNumberString', () => {
	it('coerces strict numeric strings', () => {
		expect(tryCoerceNumberString('10')).toBe(10);
		expect(tryCoerceNumberString('-3.5')).toBe(-3.5);
		expect(tryCoerceNumberString('.25')).toBe(0.25);
		expect(tryCoerceNumberString('1e3')).toBe(1000);
		expect(tryCoerceNumberString(' 42 ')).toBe(42);
	});

	it('rejects non-numeric and mixed strings', () => {
		expect(tryCoerceNumberString('10px')).toBeNull();
		expect(tryCoerceNumberString('abc')).toBeNull();
		expect(tryCoerceNumberString('')).toBeNull();
		expect(tryCoerceNumberString(10)).toBeNull();
		expect(tryCoerceNumberString(null)).toBeNull();
	});
});

describe('mergeWithDefaults', () => {
	it('keeps saved values that match the default type', () => {
		const { merged, changed } = mergeWithDefaults({ a: 1, b: 'x' }, { a: 2, b: 'y' });
		expect(merged).toEqual({ a: 2, b: 'y' });
		expect(changed).toBe(false);
	});

	it('fills missing keys from defaults and flags the change', () => {
		const { merged, changed } = mergeWithDefaults({ a: 1, b: 'x' }, { a: 2 });
		expect(merged).toEqual({ a: 2, b: 'x' });
		expect(changed).toBe(true);
	});

	it('replaces type-mismatched values with defaults', () => {
		const { merged, changed } = mergeWithDefaults({ enabled: true }, { enabled: 'yes' });
		expect(merged).toEqual({ enabled: true });
		expect(changed).toBe(true);
	});

	it('coerces numeric strings when the default is a number', () => {
		const { merged, changed } = mergeWithDefaults({ speed: 1 }, { speed: '2.5' });
		expect(merged).toEqual({ speed: 2.5 });
		expect(changed).toBe(true);
	});

	it('falls back to the default number when coercion fails', () => {
		const { merged, changed } = mergeWithDefaults({ speed: 1 }, { speed: 'fast' });
		expect(merged).toEqual({ speed: 1 });
		expect(changed).toBe(true);
	});

	it('deep-merges nested objects', () => {
		const defaults = { opts: { x: 1, y: 2 }, top: true };
		const saved = { opts: { x: 5 }, top: false };
		const { merged, changed } = mergeWithDefaults(defaults, saved);
		expect(merged).toEqual({ opts: { x: 5, y: 2 }, top: false });
		expect(changed).toBe(true);
	});

	it('preserves unknown keys the user already has', () => {
		const { merged, changed } = mergeWithDefaults({ a: 1 }, { a: 1, extra: 'kept' });
		expect(merged).toEqual({ a: 1, extra: 'kept' });
		expect(changed).toBe(false);
	});

	it('uses all defaults when saved is not an object', () => {
		const { merged, changed } = mergeWithDefaults({ a: 1 }, null);
		expect(merged).toEqual({ a: 1 });
		expect(changed).toBe(true);
	});
});
