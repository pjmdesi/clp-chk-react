const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
	/**
	 * This is the main entry point for your application, it's the first file
	 * that runs in the main process.
	 */
	entry: './src/main.js',
	// Put your normal webpack config below here
	module: {
		rules: require('./webpack.rules'),
	},
	plugins: [
		new CopyPlugin({
			patterns: [
				{ from: 'src/preload-assets', to: '../renderer/main_window/assets' },
				{ from: 'src/assets', to: '../renderer/main_window/assets' },
				{ from: 'src/assets', to: './assets' },
				// { from: 'other', to: 'public' },
			],
		}),
	],
};
