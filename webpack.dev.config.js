const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const rules = require('./webpack.rules');

// Add the same rules from renderer config
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
		test: /\.(ico|icns|png|jpg|gif|json|xml|ico|svg|mp4|avi|mov|mpeg|mp3|png|jpe?g|webp)$/i,
		type: 'asset/resource',
	}
);

module.exports = {
	mode: 'development',
	entry: './src/renderer.js',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'bundle.js',
		publicPath: '/',
	},
	devtool: 'source-map',
	target: 'web',
	module: {
		rules: rules,
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
	],
	devServer: {
		static: {
			directory: path.join(__dirname, 'src'),
		},
		hot: true,
		port: 8080,
		open: true,
		historyApiFallback: true,
		client: {
			overlay: {
				errors: true,
				warnings: false,
			},
		},
	},
};
