const rules = require('./webpack.rules');

rules.push(
	// {
	// 	test: /\.css$/,
	// 	use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
	// },
    {
		test: /\.s?[ac]ss$/i,
		use: ['style-loader', 'css-loader', 'sass-loader'],
	},
	{
		// all graphics assets
		test: /\.(ico|icns|png|jpg|gif|json|xml|ico|svg|mp4|avi|mov|mpeg|mp3|png|jpe?g|webp)$/i,
		use: [
			{
				loader: 'file-loader',
				options: {
					name: 'assets/[name].[ext]',
					publicPath: '../.',
				},
			},
		],
	}
);

module.exports = {
	// Put your normal webpack config below here
	target: 'electron-renderer',
	mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
	devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
	node: {
		__dirname: false,
		__filename: false,
	},
	resolve: {
		extensions: ['.js', '.jsx', '.json'],
		fallback: {
			events: false,
			fs: false,
			path: false,
			url: false,
			util: false,
			querystring: false,
		},
	},
	optimization: {
		minimize: process.env.NODE_ENV === 'production',
		splitChunks: process.env.NODE_ENV === 'production' ? undefined : false,
		concatenateModules: process.env.NODE_ENV === 'production',
	},
	module: {
		rules,
	},
};
