import React from 'react';

import defaultKeyboardControlsMap from '../../settings/keyboardControlsMap';

const normalizeKey = key => {
	if (typeof key !== 'string') return '';
	if (key === ' ') return 'space';
	return key.toLowerCase();
};

const normalizeModifiers = modifiers => {
	if (!Array.isArray(modifiers)) return { ctrl: false, shift: false, alt: false, meta: false };
	const lower = modifiers.map(m => String(m).toLowerCase());
	return {
		ctrl: lower.includes('ctrl') || lower.includes('control'),
		shift: lower.includes('shift'),
		alt: lower.includes('alt') || lower.includes('option'),
		meta: lower.includes('meta') || lower.includes('cmd') || lower.includes('command'),
	};
};

const modifiersObjectToArray = mods => {
	const out = [];
	if (mods?.ctrl) out.push('ctrl');
	if (mods?.shift) out.push('shift');
	if (mods?.alt) out.push('alt');
	if (mods?.meta) out.push('meta');
	return out;
};

const isModifierOnlyKey = key => {
	const k = normalizeKey(key);
	return k === 'shift' || k === 'control' || k === 'ctrl' || k === 'alt' || k === 'meta' || k === 'os';
};

const formatKeyLabel = key => {
	const k = normalizeKey(key);
	if (!k) return '';
	if (k === 'space') return 'Space';
	if (k.startsWith('arrow')) {
		const dir = k.replace('arrow', '');
		return `Arrow ${dir.charAt(0).toUpperCase()}${dir.slice(1)}`;
	}
	if (k.length === 1) return k.toUpperCase();
	return k;
};

const formatShortcut = entry => {
	if (!entry || typeof entry !== 'object') return '';
	const mods = normalizeModifiers(entry.modifiers);
	const keys = Array.isArray(entry.keys) ? entry.keys : [];
	if (!keys.length) return '';

	// If Shift is required and multiple keys are listed, prefer the “shifted” variant.
	const chosenKey = mods.shift && keys.length > 1 ? keys[keys.length - 1] : keys[0];
	const parts = [];
	if (mods.ctrl) parts.push('Ctrl');
	if (mods.shift) parts.push('Shift');
	if (mods.alt) parts.push('Alt');
	if (mods.meta) parts.push('Meta');
	parts.push(formatKeyLabel(chosenKey));
	return parts.filter(Boolean).join(' + ');
};

function KeyboardShortcuts({ keyboardControlsRef, setKeyboardControls }) {
	const initialMap = keyboardControlsRef?.current || defaultKeyboardControlsMap;
	const [localMap, setLocalMap] = React.useState(() => initialMap);
	const [listeningKey, setListeningKey] = React.useState(null);
	const [error, setError] = React.useState('');

	const entries = React.useMemo(() => {
		const mapObj = localMap && typeof localMap === 'object' ? localMap : {};
		return Object.entries(mapObj)
			.filter(([, entry]) => entry && typeof entry === 'object' && !entry.hideInUI)
			.sort((a, b) => {
				const at = String(a[1]?.title || a[0]).toLowerCase();
				const bt = String(b[1]?.title || b[0]).toLowerCase();
				return at.localeCompare(bt);
			});
	}, [localMap]);

	const applyMapUpdate = React.useCallback(
		nextMap => {
			setLocalMap(nextMap);
			if (typeof setKeyboardControls === 'function') {
				setKeyboardControls(nextMap);
			}
		},
		[setKeyboardControls]
	);

	const findConflict = React.useCallback(
		(targetKey, targetModsObj, ignoreMapKey) => {
			const mapObj = localMap && typeof localMap === 'object' ? localMap : {};
			for (const [mapKey, entry] of Object.entries(mapObj)) {
				if (mapKey === ignoreMapKey) continue;
				if (!entry || typeof entry !== 'object') continue;
				const mods = normalizeModifiers(entry.modifiers);
				if (mods.ctrl !== targetModsObj.ctrl) continue;
				if (mods.shift !== targetModsObj.shift) continue;
				if (mods.alt !== targetModsObj.alt) continue;
				if (mods.meta !== targetModsObj.meta) continue;
				const keys = Array.isArray(entry.keys) ? entry.keys : [];
				if (keys.map(normalizeKey).includes(normalizeKey(targetKey))) {
					return entry.title || entry.action || mapKey;
				}
			}
			return null;
		},
		[localMap]
	);

	const updateShortcut = React.useCallback(
		(mapKey, nextKeys, nextModifiersArray) => {
			setError('');
			const mapObj = localMap && typeof localMap === 'object' ? localMap : {};
			const existing = mapObj[mapKey];
			if (!existing || typeof existing !== 'object') return;

			const chosenKey = Array.isArray(nextKeys) ? nextKeys[0] : '';
			if (!chosenKey) return;

			const modsObj = normalizeModifiers(nextModifiersArray);
			const conflict = findConflict(chosenKey, modsObj, mapKey);
			if (conflict) {
				setError(`Shortcut is already assigned to: ${conflict}`);
				return;
			}

			const nextMap = {
				...mapObj,
				[mapKey]: {
					...existing,
					keys: [normalizeKey(chosenKey)],
					modifiers: modifiersObjectToArray(modsObj),
				},
			};

			applyMapUpdate(nextMap);
		},
		[applyMapUpdate, findConflict, localMap]
	);

	const clearShortcut = React.useCallback(
		mapKey => {
			setError('');
			const mapObj = localMap && typeof localMap === 'object' ? localMap : {};
			const existing = mapObj[mapKey];
			if (!existing || typeof existing !== 'object') return;
			const nextMap = {
				...mapObj,
				[mapKey]: {
					...existing,
					keys: [],
				},
			};
			applyMapUpdate(nextMap);
		},
		[applyMapUpdate, localMap]
	);

	const resetToDefaults = React.useCallback(() => {
		setError('');
		applyMapUpdate(defaultKeyboardControlsMap);
	}, [applyMapUpdate]);

	return (
		<div id="keyboardShortcuts" className="keyboard-shortcuts input-group">
			<div className="control-group">
				<h3 style={{ flex: '1 0 auto' }}>Keyboard Shortcuts</h3>
				<button onClick={resetToDefaults} title="Reset all shortcuts to defaults">
					Reset Defaults
				</button>
			</div>

			{error && (
				<div className="control-group">
					<p className="keyboard-shortcuts-error">{error}</p>
				</div>
			)}

			<div className="keyboard-shortcuts-list">
				{entries.map(([mapKey, entry]) => {
					const display = formatShortcut(entry);
					const isListening = listeningKey === mapKey;
					return (
						<div className="keyboard-shortcuts-row" key={mapKey}>
							<label className="keyboard-shortcuts-title" title={entry.description}>{entry.title || mapKey}</label>
							<input
								className={['keyboard-shortcuts-input', isListening ? 'listening' : ''].join(' ')}
								type="text"
								readOnly
								value={isListening ? 'Press shortcut… (Esc to cancel)' : display}
								placeholder="Unassigned"
								onFocus={() => {
									setError('');
									setListeningKey(mapKey);
								}}
								onBlur={() => {
									setListeningKey(prev => (prev === mapKey ? null : prev));
								}}
								onKeyDown={e => {
									if (listeningKey !== mapKey) return;
									e.preventDefault();
									e.stopPropagation();

									if (e.key === 'Escape') {
										setListeningKey(null);
										return;
									}

									if (isModifierOnlyKey(e.key)) {
										return;
									}

									const key = normalizeKey(e.key);
									if (!key) return;

									const modsObj = {
										ctrl: !!e.ctrlKey,
										shift: !!e.shiftKey,
										alt: !!e.altKey,
										meta: !!e.metaKey,
									};
									updateShortcut(mapKey, [key], modifiersObjectToArray(modsObj));
									setListeningKey(null);
								}}
							/>
							<button className="keyboard-shortcuts-clear" onClick={() => clearShortcut(mapKey)} title="Clear this shortcut">
								Clear
							</button>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default KeyboardShortcuts;
