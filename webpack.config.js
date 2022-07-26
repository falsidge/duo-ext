/* eslint-disable unicorn/prefer-module */
/* eslint-disable node/prefer-global/process */
/* eslint-disable node/prefer-global/buffer */
const path = require('path');
const webpack = require('webpack');
const FilemanagerPlugin = require('filemanager-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
// Const ExtensionReloader = require('webpack-extension-reloader');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const WebpackDevServer = require('webpack-dev-server');

const nodeEnv = process.env.NODE_ENV || 'development';
const targetBrowser = process.env.TARGET_BROWSER;

// Const extensionReloaderPlugin =
//   nodeEnv === 'development'
//     ? new ExtensionReloader({
//         port: 9090,
//         reloadPage: true,
//         entries: {
//           // TODO: reload manifest on update
//           contentScript: 'content',
//           background: 'background',
//           extensionPage: ['popup', 'options'],
//         },
//       })
//     : () => {
//         this.apply = () => {};
//       };

const getExtensionFileType = browser => {
	if (browser === 'opera') {
		return 'crx';
	}

	if (browser === 'firefox') {
		return 'xpi';
	}

	return 'zip';
};

module.exports = env => {
	const config = {
		devtool: false, // https://github.com/webpack/webpack/issues/1194#issuecomment-560382342

		mode: nodeEnv,

		stats: {
			all: false,
			builtAt: true,
			errors: true,
			hash: true,
		},

		entry: {
			background: './source/scripts/background.js',
			content: './source/scripts/content.js',
			popup: './source/scripts/popup.js',
			options: './source/scripts/options.js',
		},

		output: {
			path: path.resolve(__dirname, 'extension', targetBrowser),
			filename: 'js/[name].bundle.js',
		},

		module: {
			rules: [
				{
					test: /.(js|jsx)$/,
					include: [path.resolve(__dirname, 'source/scripts')],
					loader: 'babel-loader',

					options: {
						plugins: ['syntax-dynamic-import'],

						presets: [
							[
								'@babel/preset-env',
								{
									modules: false,
								},
							],
						],
					},
				},
				{
					test: /\.scss$/,
					use: [
						{
							loader: MiniCssExtractPlugin.loader, // It creates a CSS file per JS file which contains CSS
						},
						{
							loader: 'css-loader',
							options: {
								sourceMap: nodeEnv === 'development',
							},
						},
						{
							loader: 'postcss-loader',
							options: {
								postcssOptions: {
									plugins: [
										[
											'autoprefixer',
											{
												// Options
											},
										],
									],
								},
							},
						},
						'resolve-url-loader',
						'sass-loader',
					],
				},
			],
		},

		plugins: [
			new webpack.ProgressPlugin(),
			// Generate manifest.json
			// Generate sourcemaps
			new webpack.SourceMapDevToolPlugin({filename: false}),
			new webpack.EnvironmentPlugin(['NODE_ENV', 'TARGET_BROWSER']),
			new CleanWebpackPlugin({
				cleanOnceBeforeBuildPatterns: [
					path.join(process.cwd(), `extension/${targetBrowser}`),
					path.join(
						process.cwd(),
						`extension/${targetBrowser}.${getExtensionFileType(targetBrowser)}`,
					),
				],
				cleanStaleWebpackAssets: false,
				verbose: true,
			}),
			// Write css file(s) to build folder
			new MiniCssExtractPlugin({filename: 'css/[name].css'}),
			new HtmlWebpackPlugin({
				template: 'source/options.html',
				inject: 'body',
				hash: true,
				chunks: ['options'],
				filename: 'options.html',
			}),
			new HtmlWebpackPlugin({
				template: 'source/popup.html',
				inject: 'body',
				hash: true,
				chunks: ['popup'],
				filename: 'popup.html',
			}),
			// Copy static assets
			new CopyWebpackPlugin({
				patterns: [
					{from: 'source/assets', to: 'assets'},
					{
						from: 'source/' + (targetBrowser === 'firefox' ? 'manifest.v2.json' : 'manifest.v3.json'),
						to: path.join(__dirname, 'extension', targetBrowser, 'manifest.json'),
						force: true,
						transform(content) {
							// Generates the manifest file using the package.json informations
							return Buffer.from(
								JSON.stringify(
									{
										...JSON.parse(content.toString()),
										description: process.env.npm_package_description,
										version: process.env.npm_package_version,
									},
									null,
									'\t',
								),
							);
						},
					},
				],
			}),
			// Plugin to enable browser reloading in development mode
			// extensionReloaderPlugin,
		],

		optimization: {
			minimize: true,
			minimizer: [
				new TerserPlugin({
					parallel: true,
					terserOptions: {
						format: {
							comments: false,
						},
					},
					extractComments: false,
				}),
				new CssMinimizerPlugin(),
				new FilemanagerPlugin({
					events: {
						onEnd: {
							archive: [
								{
									format: 'zip',
									source: path.join(__dirname, 'extension', targetBrowser),
									destination: `${path.join(
										__dirname,
										'extension',
										targetBrowser,
									)}.${getExtensionFileType(targetBrowser)}`,
									options: {zlib: {level: 6}},
								},
							],
						},
					},
				}),
			],
		},
	};
	if (env.WEBPACK_WATCH) {
		config.plugins.push(new webpack.HotModuleReplacementPlugin());
		const compiler = webpack(config);

		const server = new WebpackDevServer(
			{
				https: false,
				hot: false,
				client: false,
				port: env.PORT,
				host: 'localhost',
				static: {
					directory: path.join(__dirname, '../extension'),
					watch: false,
				},
				headers: {
					'Access-Control-Allow-Origin': '*',
				},
				devMiddleware: {
					publicPath: `http://localhost:${env.PORT}`,
					writeToDisk: true,
				},
				allowedHosts: 'all',
			},
			compiler,
		);
		if (process.env.NODE_ENV === 'development' && module.hot) {
			module.hot.accept();
		}

		server.start();
		return [];
	}

	return config;
};
