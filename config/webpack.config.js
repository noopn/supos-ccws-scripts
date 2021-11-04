
const path = require('path');

module.exports = {
    output:{
        filename:'index.js',
        publicPath:'/'
    },
    module:{
        rules:[
            {
            test:/\.(css|scss)$/,
            use:[
                require.resolve('style-loader'),
                {
                    loader:require.resolve('css-loader'),
                    options:{
                        modules: true,
                    }
                }
                ,
                require.resolve('postcss-loader'),
                require.resolve('sass-loader'),
            ]
        },
        {
            test: /\.(js|mjs|jsx|ts|tsx)$/,
            loader: require.resolve('babel-loader'),
            options:{
                "presets": [
                    require.resolve('@babel/preset-react'),
                    require.resolve('@babel/preset-typescript')
                ]
            },
            exclude: /node_modules/,
        }]
    },
    
    resolve: {
        extensions: ['.tsx','.jsx','.ts', '.js'],
        modules: [path.resolve(__dirname,'../node_modules')],
    }
};

