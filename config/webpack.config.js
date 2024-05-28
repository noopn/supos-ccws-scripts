const path = require("path");

module.exports = (mode) => ({
  module: {
    rules: [
      {
        oneOf: [
          {
            test: /\.module\.(css|scss)$/,
            use: [
              "style-loader",
              {
                loader: "css-loader",
                options: {
                  modules: {
                    mode: "local",
                    localIdentName: "[local]_[hash:base64:5]",
                  },
                  importLoaders: 1,
                },
              },

              {
                loader: "postcss-loader",
                options: {
                  postcssOptions: {
                    plugins: [["postcss-preset-env"]],
                  },
                },
              },
              "sass-loader",
            ],
          },
          {
            test: /\.(css|scss)$/,
            use: [
              "style-loader",
              //   require.resolve("vue-style-loader"),
              {
                loader: "css-loader",
              },
              {
                loader: "postcss-loader",
                options: {
                  postcssOptions: {
                    plugins: [["postcss-preset-env"]],
                  },
                },
              },
              "sass-loader",
            ],
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif|webp|svg)$/,
        type: "asset",
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024,
          },
        },
        generator: {
          filename: "[name][ext][query]",
        },
      },
      {
        test: /\.(js|mjs|jsx|ts|tsx)$/,
        use: [
          {
            loader: "babel-loader",
            options: {
              sourceType: "unambiguous",
              presets: [
                [
                  "@babel/preset-env",
                  {
                    targets: {
                      chrome: "49",
                      ios: "10",
                    },
                  },
                ],
                // [
                // "@babel/preset-env",
                // {
                //   useBuiltIns: "usage",
                //   corejs: "2",
                // },
                // ],
                "@babel/preset-react",
                "@babel/preset-typescript",
              ],
              plugins: [
                mode === "development" ? "react-refresh/babel" : null,
              ].filter(Boolean),
            },
          },
        ],
        // exclude: /node_modules(\/|\\)(?!supos-ccws-scripts)/,
      },
    ],
  },
  // antd v3.10.10 bug
  // https://github.com/ant-design/ant-design/issues/15073
  stats: {
    warningsFilter: [/text-decoration-skip/, /version/],
  },
  resolve: {
    extensions: [".tsx", ".jsx", ".ts", ".js"],
    modules: [path.resolve(process.cwd(), "./node_modules")],
  },
  // resolveLoader: {
  //   modules:  [path.resolve(process.cwd(), "./node_modules")],
  // },
  plugins: [],
});
