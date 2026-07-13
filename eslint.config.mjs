import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
	{
		ignores: [
			'node_modules/**',
			'dist/**',
			'.webpack/**',
			'out/**',
			'third_party_licenses/**',
			// Reference snippet copied from StackOverflow, not part of the app.
			'get-avg-fps.js',
		],
	},
	js.configs.recommended,
	{
		files: ['**/*.{js,jsx,mjs}'],
		plugins: {
			react,
			'react-hooks': reactHooks,
		},
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			parserOptions: {
				ecmaFeatures: { jsx: true },
			},
			globals: {
				...globals.browser,
				...globals.node,
				// Injected by Electron Forge's webpack plugin at build time.
				MAIN_WINDOW_WEBPACK_ENTRY: 'readonly',
				MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: 'readonly',
			},
		},
		settings: {
			react: { version: 'detect' },
		},
		rules: {
			// Babel is configured with the classic JSX runtime, so `React` must be
			// imported wherever JSX appears; these keep no-unused-vars accurate for JSX.
			'react/jsx-uses-react': 'error',
			'react/jsx-uses-vars': 'error',
			'react/jsx-key': 'warn',
			'react/jsx-no-duplicate-props': 'error',
			'react/jsx-no-undef': 'error',

			'react-hooks/rules-of-hooks': 'error',
			// Warn (not error) for now: the codebase has intentional ref-based patterns;
			// tighten to error once existing warnings are triaged.
			'react-hooks/exhaustive-deps': 'warn',

			'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
			// The player/sync code intentionally swallows errors from media APIs.
			'no-empty': ['error', { allowEmptyCatch: true }],
		},
	},
];
