const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
	/**
	 * This is the main entry point for your application, it's the first file
	 * that runs in the main process.
	 */
	target: 'electron-main',
	mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
	entry: './src/main.js',
	// Put your normal webpack config below here
	devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
	node: {
		__dirname: false,
		__filename: false,
	},
	resolve: {
		extensions: ['.js', '.jsx', '.json'],
	},
	optimization: {
		minimize: process.env.NODE_ENV === 'production',
	},
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
