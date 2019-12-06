const { CheckerPlugin } = require('awesome-typescript-loader');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
    mode: 'production',
    context: __dirname + '/src',
    entry: ['@babel/polyfill', './'],
    output: {
        path: __dirname + '/dist',
        filename: 'lemon.front.bundle.js',
        libraryTarget: 'umd',
        library: 'Lemon',
        umdNamedDefine: true,
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'awesome-typescript-loader',
                options: {
                    useBabel: true,
                    babelCore: '@babel/core' // needed for Babel v7
                }
            },
        ],
    },
    plugins: [
        new CleanWebpackPlugin(),
        new CheckerPlugin(),
        new UglifyJsPlugin()
    ],
};
