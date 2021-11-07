
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const webpackConfig = (options)=>{
    const {
        entry,
        componentOutputPath
    } = options;

    return {
        entry,
        output:{
            filename:'index.js',
            path:componentOutputPath,
            publicPath:'/'
        },
        mode:'development',
        module:{
            strictExportPresence:true,
            rules:[{ 
                parser: { requireEnsure: false }
            },{
                test:/\.(css|scss)$/,
                use:[
                    require.resolve('style-loader'),
                    require.resolve('css-loader'),
                    require.resolve('postcss-loader'),
                    require.resolve('sass-loader'),
                ]
            },{
                test: /\.(js|mjs|jsx|ts|tsx)$/,
                loader: require.resolve('babel-loader'),
                options:{
                    "presets": [
                        require.resolve('@babel/preset-react'),
                        require.resolve('@babel/preset-typescript'),
                    ]
                },
                exclude: /node_modules/,
            }]
        },
        resolve: {
            extensions: ['.tsx','.jsx','.ts', '.js'],
        },
        plugins: [new HtmlWebpackPlugin({
            template:path.join(__dirname,'../public/index.html'),
            filename:'index.html'
        })],
    }
}

module.exports = webpackConfig;

