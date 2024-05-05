module.exports = [
	{
		test: /native_modules[/\\].+\.node$/,
		use: 'node-loader',
	},
	{
		test: /\.jsx?$/,
		use: {
			loader: 'babel-loader',
			options: {
				exclude: /node_modules/,
				presets: ['@babel/preset-react'],
			},
		},
	},
	{
		test: /[/\\]node_modules[/\\].+\.(m?js|node)$/,
		parser: { amd: false },
		use: {
			loader: '@vercel/webpack-asset-relocator-loader',
			options: {
				outputAssetBase: 'native_modules',
			},
		},
	},
];
