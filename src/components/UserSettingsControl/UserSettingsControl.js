import React from 'react';

import PlayerSlider from '../PlayerSlider';
import PlayerToggle from '../PlayerToggle/PlayerToggle';

import { userSettingsSections, sanitizeAppSettings, clampToolZoomScale } from '../../settings/userSettingsSchema';
import defaultToolSettings from '../../settings/defaultToolSettings';
import defaultAppSettings from '../../settings/defaultAppSettings';

const coerceNumber = value => {
	if (typeof value === 'number') return value;
	if (typeof value === 'string') {
		const n = Number(value);
		return Number.isFinite(n) ? n : null;
	}
	return null;
};

function UserSettingsControl({ toolSettings, setToolSettings, appSettings, setAppSettings, toolSettingsRef, appSettingsRef, closeModal }) {
	if (!toolSettings || typeof setToolSettings !== 'function') {
		return (
			<div>
				<p>Settings are not available (missing tool settings bindings).</p>
				{typeof closeModal === 'function' && <button onClick={closeModal}>Close</button>}
			</div>
		);
	}

	const currentToolSettings = toolSettingsRef?.current || toolSettings;
	const currentAppSettings = appSettingsRef?.current || appSettings;

	// Modal props are snapshotted at open time in this app; refs are the live source of truth.
	const renderToolSettings = toolSettingsRef?.current || toolSettings;
	const renderAppSettings = appSettingsRef?.current || appSettings;

	const resetToDefaults = () => {
		// Reset only the settings that are declared as user-editable in the schema.
		const toolKeys = [];
		const appKeys = [];
		for (const section of userSettingsSections) {
			for (const item of section.items || []) {
				if (!item || !item.key) continue;
				if (item.scope === 'app') appKeys.push(item.key);
				else toolKeys.push(item.key);
			}
		}

		if (typeof setAppSettings === 'function' && appKeys.length) {
			setAppSettings(prev => {
				const base = prev || currentAppSettings || {};
				let next = { ...base };
				for (const key of appKeys) {
					if (Object.prototype.hasOwnProperty.call(defaultAppSettings, key)) {
						next[key] = defaultAppSettings[key];
					}
				}
				next = sanitizeAppSettings(next, null);
				return next;
			});
		}

		if (typeof setToolSettings === 'function' && toolKeys.length) {
			setToolSettings(prev => {
				const base = prev || currentToolSettings || {};
				let next = { ...base };
				for (const key of toolKeys) {
					if (Object.prototype.hasOwnProperty.call(defaultToolSettings, key)) {
						next[key] = defaultToolSettings[key];
					}
				}
				// Keep zoomScale clamped to the (possibly app-reset) bounds.
				return clampToolZoomScale(next, currentAppSettings);
			});
		}
	};

	const updateSetting = (scope, key, nextValue) => {
		const numericValue = coerceNumber(nextValue);

		if (scope === 'app') {
			if (typeof setAppSettings !== 'function') return;
			setAppSettings(prev => {
				const base = prev || currentAppSettings || {};
				const candidate = { ...base, [key]: numericValue === null ? nextValue : numericValue };
				const sanitized = sanitizeAppSettings(candidate, key);

				// When zoom bounds change, keep the current tool zoomScale in range.
				if (key === 'zoomMin' || key === 'zoomMax') {
					setToolSettings(tsPrev => clampToolZoomScale(tsPrev || currentToolSettings, sanitized));
				}

				return sanitized;
			});
			return;
		}

		setToolSettings(prev => {
			const base = prev || currentToolSettings;
			return { ...base, [key]: numericValue === null ? nextValue : numericValue };
		});
	};

	const getScopedValue = (scope, key) => {
		if (scope === 'app') return renderAppSettings ? renderAppSettings[key] : undefined;
		return renderToolSettings ? renderToolSettings[key] : undefined;
	};

	return (
		<div className="user-settings-control input-group">
			{userSettingsSections.map(section => (
				<React.Fragment key={section.id}>
					<div className="control-section">
                        <div className="control-group">
                            <h3>{section.title}</h3>
                        </div>
                        {section.items.map(item => {
                            const value = getScopedValue(item.scope, item.key);
                            const labelText = item.label || item.key;
                            if (item.control === 'toggle' || item.type === 'boolean') {
                                return (
                                    <div className="control-group" key={`${item.scope}:${item.key}`}>
                                        <div className="control-subgroup">
                                            <PlayerToggle labelText={labelText} value={!!value} onChange={v => updateSetting(item.scope, item.key, v)} />
                                        </div>
                                    </div>
                                );
                            }
                            if (item.control === 'slider' || item.type === 'number') {
                                const min = typeof item.min === 'number' ? item.min : 0;
                                const max = typeof item.max === 'number' ? item.max : 1;
                                const step = typeof item.step === 'number' ? item.step : 1;
                                const format = typeof item.format === 'function' ? item.format : v => String(v);
                                const unit = item.unit || '';
                                return (
                                    <div className="control-group" key={`${item.scope}:${item.key}`}>
                                        <div className="control-subgroup">
                                            <label style={{ display: 'block', marginBottom: '6px' }}>{labelText}</label>
                                            <PlayerSlider
                                                name={labelText}
                                                value={typeof value === 'number' ? value : 0}
                                                sliderMinMax={[min, max]}
                                                stepValue={step}
                                                useSignificantFigures
                                                label={unit}
                                                onChange={v => updateSetting(item.scope, item.key, v)}
                                                valueFormatter={format}
                                            />
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
				</React.Fragment>
			))}
            <div className="control-group-spacer"></div>
			<div className="control-group">
				<button onClick={resetToDefaults} title="Reset user settings to defaults">
					Reset to Defaults
				</button>
			</div>
		</div>
	);
}

export default UserSettingsControl;
