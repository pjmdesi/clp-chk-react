const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');
const { generateThirdPartyNotices } = require('./scripts/generate-third-party-notices');
const { generateThirdPartyLicenses } = require('./scripts/generate-third-party-licenses');

module.exports = {
	packagerConfig: {
		asar: true,
		icon: './src/assets/images/app-icon',
		extraResource: [
			path.join(__dirname, 'LICENSE'),
			path.join(__dirname, 'THIRD_PARTY_NOTICES.md'),
			path.join(__dirname, 'third_party_licenses'),
		],
	},
	rebuildConfig: {},
	hooks: {
		prePackage: async () => {
			// Keep third-party notices up to date in release builds.
			generateThirdPartyNotices({ rootDir: __dirname, outFile: 'THIRD_PARTY_NOTICES.md' });
			generateThirdPartyLicenses({ rootDir: __dirname, outDir: 'third_party_licenses' });
		},
	},
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
					"default-src 'self' 'unsafe-inline' data: filesystem: blob:; script-src 'self' 'unsafe-eval' 'unsafe-inline' data: blob:; media-src 'self' 'unsafe-inline' data: filesystem: blob:;",
				mainConfig: './webpack.main.config.js',
				devServer: {
					hot: false,
					liveReload: false,
					client: false,
				},
				devtool: 'source-map',
				port: 3000,
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
