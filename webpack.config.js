const { CheckerPlugin } = require('awesome-typescript-loader');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');


module.exports = {
    mode: 'production',
    context: __dirname + '/src',
    entry: {
        Lemon: './',
    },
    output: {
        path: __dirname + '/dist',
        filename: 'lemon.front.lib.js',
        libraryTarget: 'umd',
        library: ['[name]'], // Lemon
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
            },
        ],
    },
    plugins: [new CheckerPlugin(), new UglifyJsPlugin()],
};
