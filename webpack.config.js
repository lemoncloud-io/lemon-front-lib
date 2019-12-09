const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
    mode: 'production',
    context: __dirname + '/src',
    entry: ['./', 'babel-polyfill'],
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
        rules: [{
            test: /\.ts?$/,
            exclude: /node_modules/,
            use: [
                {
                    loader: 'babel-loader',
                    query: {
                        presets: ['@babel/env']
                    }
                },
                {
                    loader: 'ts-loader'
                }

            ]
        }]
    },
    plugins: [
        new CleanWebpackPlugin(),
        new UglifyJsPlugin()
    ],
};
