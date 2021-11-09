
const path = require('path');

module.exports = {
    output: {
        filename: 'index.js',
        publicPath: '/'
    },
    module: {
        rules: [
            {
                oneOf: [
                    {
                        test: /\.module\.(css|scss)$/,
                        use: [
                            require.resolve('style-loader'),
                            {
                                loader: require.resolve('css-loader'),
                                options: {
                                    modules: true,
                                }
                            },

                            {
                                loader: require.resolve('postcss-loader'),
                                options: {
                                    postcssOptions: {
                                        plugins: [
                                            [
                                                require.resolve('postcss-preset-env'),

                                            ],
                                        ],
                                    },
                                },
                            },
                            require.resolve('sass-loader')

                        ]
                    },
                    {
                        test: /\.(css|scss)$/,
                        use: [
                            require.resolve('style-loader'),
                            require.resolve('css-loader'),
                            {
                                loader: require.resolve('postcss-loader'),
                                options: {
                                    postcssOptions: {
                                        plugins: [
                                            [
                                                require.resolve('postcss-preset-env'),
                                            ],
                                        ],
                                    },
                                },
                            },
                            require.resolve('sass-loader'),
                        ]
                    },
                ]
            },
            {
                test: /\.(js|mjs|jsx|ts|tsx)$/,
                loader: require.resolve('babel-loader'),
                options: {
                    "presets": [
                        require.resolve('@babel/preset-react'),
                        require.resolve('@babel/preset-typescript')
                    ]
                }
            }]
    },

    resolve: {
        extensions: ['.tsx', '.jsx', '.ts', '.js'],
        modules: [path.resolve(__dirname, '../node_modules'), path.resolve(process.cwd(), './node_modules')],
    },
    resolveLoader: {
        modules: [path.resolve(__dirname, '../node_modules'), path.resolve(process.cwd(), './node_modules')],
    }
};

