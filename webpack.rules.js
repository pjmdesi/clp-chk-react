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
	// Asset relocator loader commented out due to __dirname issues
	// You may need this if you have native node modules
	// {
	// 	test: /[/\\]node_modules[/\\].+\.(m?js|node)$/,
	// 	exclude: /webpack-asset-relocator-loader/,
	// 	parser: { amd: false },
	// 	use: {
	// 		loader: '@vercel/webpack-asset-relocator-loader',
	// 		options: {
	// 			outputAssetBase: 'native_modules',
	// 			wrapperCompatibility: true,
	// 			escapeNonAnalyzableRequires: false,
	// 		},
	// 	},
	// },
];
