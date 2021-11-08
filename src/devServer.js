const path = require('path');
const webpack = require('webpack');
const fse = require('fs-extra');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WebpackDevServer = require('webpack-dev-server');
const { merge } = require('webpack-merge');
const baseConfig = require('../config/webpack.config');
const entryFile = require('../src/entryFile');

const {
    SERVER_ENTRY_PATH,
} = require('../config');

const devServer = async (appInfo) => {
    const {
        componentName,
        componentOutputPath
    } = appInfo;
    
    const entryTpl = entryFile(appInfo);

    await fse.remove(SERVER_ENTRY_PATH);
    await fse.ensureFile(SERVER_ENTRY_PATH);
    await fse.writeFile(SERVER_ENTRY_PATH, entryTpl);

    const webpackConfig = merge(baseConfig, {
        entry: SERVER_ENTRY_PATH,
        output: {
            path: componentOutputPath,
        },
        devtool:"eval-source-map",
        mode: 'development',
        module: {
            rules: [{
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: 'asset/resource',
            }]
        },
        plugins: [new HtmlWebpackPlugin({
            template: path.join(__dirname, '../public/template.html'),
            filename: 'index.html',
            title: componentName,
        }),
        new webpack.ProvidePlugin({
            _: 'lodash',
            scriptUtil:path.resolve(__dirname,'./scriptUtil.js')
        })],
    })
    const compiler = webpack(webpackConfig);
    const server = new WebpackDevServer({
        compress: true,
        hot: true,
        open: true,
        proxy: {
            '/': {
                target: appInfo.origin,
                changeOrigin: true,
            }
        }
    }, compiler)

    await server.start();

}


module.exports = devServer;