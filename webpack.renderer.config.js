const rules = require('./webpack.rules');

rules.push(
    {
		test: /\.s?[ac]ss$/i,
		use: ['style-loader', 'css-loader', 'sass-loader'],
	},
	{
		// Fonts are inlined as data: URLs. The renderer is served from inside the
		// asar in production, where document-relative asset URLs are fragile —
		// css-loader's url() handling (v6+) bypassed the old file-loader rule and
		// emitted the font at a path unreachable from main_window/, so the app
		// silently fell back to the default font. Inlining removes path
		// resolution entirely; the size cost is irrelevant for a local bundle.
		test: /\.(woff2?|ttf|otf|eot)$/i,
		type: 'asset/inline',
	},
	{
		// all graphics/media assets
		test: /\.(ico|icns|png|jpg|gif|json|xml|svg|mp4|avi|mov|mpeg|mp3|jpe?g|webp)$/i,
		type: 'asset/resource',
		generator: {
			filename: 'assets/[name][ext][query]',
		},
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
