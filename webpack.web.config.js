const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const rules = require('./webpack.rules');

rules.push(
	{
		test: /\.s?[ac]ss$/i,
		use: [
			'style-loader',
			'css-loader',
			{
				loader: 'sass-loader',
				options: {
					sassOptions: {
						quietDeps: true,
						silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin', 'color-functions', 'slash-div'],
					},
				},
			},
		],
	},
	{
		// graphics, media, fonts
		test: /\.(ico|icns|png|jpg|gif|json|xml|svg|mp4|avi|mov|mpeg|mp3|jpe?g|webp|woff2?|ttf|otf|eot)$/i,
		type: 'asset/resource',
		generator: {
			filename: 'assets/[name][ext][query]',
		},
	}
);

module.exports = (env, argv) => {
	const mode = argv?.mode || process.env.NODE_ENV || 'production';
	const isProd = mode === 'production';

	return {
		mode,
		target: 'web',
		entry: './src/renderer.js',
		output: {
			path: path.resolve(__dirname, 'dist'),
			filename: isProd ? 'bundle.[contenthash].js' : 'bundle.js',
			publicPath: '/',
			clean: true,
		},
		devtool: isProd ? false : 'source-map',
		module: {
			rules,
		},
		resolve: {
			extensions: ['.js', '.jsx', '.json'],
			fallback: {
				fs: false,
				path: false,
				events: false,
				util: false,
			},
		},
		plugins: [
			new HtmlWebpackPlugin({
				template: './src/index.html',
				inject: 'body',
			}),
			new CopyPlugin({
				patterns: [{ from: 'src/_redirects', to: '_redirects', toType: 'file', noErrorOnMissing: true }],
			}),
		],
		optimization: {
			minimize: isProd,
		},
	};
};
