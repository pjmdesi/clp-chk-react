const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');

module.exports = {
	packagerConfig: {
		asar: true,
		icon: './src/assets/images/app-icon',
	},
	rebuildConfig: {},
	makers: [
		{
			name: '@electron-forge/maker-squirrel',
			config: {
				options: {
                    setupIcon: './src/assets/images/app-icon.ico',
					icon: './src/assets/images/app-icon.ico',
				},
			},
		},
		{
			name: '@electron-forge/maker-zip',
			platforms: ['darwin'],
		},
		{
			name: '@electron-forge/maker-deb',
			config: {
				options: {
					icon: './src/assets/images/app-icon.png',
				},
			},
		},
		{
			name: '@rabbitholesyndrome/electron-forge-maker-portable',
			config: {
				icon: './assets/images/app-icon.ico',
			},
		},
		{
			name: '@electron-forge/maker-rpm',
			config: {},
		},
	],
	plugins: [
		{
			name: '@electron-forge/plugin-auto-unpack-natives',
			config: {},
		},
		{
			name: '@electron-forge/plugin-webpack',
			config: {
				devContentSecurityPolicy:
					"default-src 'self' 'unsafe-inline' data: filesystem:; script-src 'self' 'unsafe-eval' 'unsafe-inline' data:; media-src 'self' 'unsafe-inline' data: filesystem:;",
				mainConfig: './webpack.main.config.js',
				renderer: {
					config: './webpack.renderer.config.js',
					entryPoints: [
						{
							html: './src/index.html',
							js: './src/renderer.js',
							name: 'main_window',
							preload: {
								js: './src/preload.js',
							},
						},
					],
				},
			},
		},
		// Fuses are used to enable/disable various Electron functionality
		// at package time, before code signing the application
		new FusesPlugin({
			version: FuseVersion.V1,
			[FuseV1Options.RunAsNode]: false,
			[FuseV1Options.EnableCookieEncryption]: true,
			[FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
			[FuseV1Options.EnableNodeCliInspectArguments]: false,
			[FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
			[FuseV1Options.OnlyLoadAppFromAsar]: true,
		}),
	],
};
