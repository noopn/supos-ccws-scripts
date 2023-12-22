const path = require("path");
module.exports = {
  output: {
    filename: "index.js",
    publicPath: "/",
  },
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
                  modules: true,
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
              "css-loader",
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
        test: /\.(js|mjs|jsx|ts|tsx)$/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: [
                require.resolve("@babel/preset-env"),
                require.resolve("@babel/preset-react"),
                require.resolve("@babel/preset-typescript"),
              ],
            },
          },
        ],
      },
    ],
  },
  // antd v3.10.10 bug
  // https://github.com/ant-design/ant-design/issues/15073
  stats: {
    warningsFilter: [/text-decoration-skip/, /version/],
  },
  //   plugins: [new VueLoaderPlugin()],
  resolve: {
    extensions: [".tsx", ".jsx", ".ts", ".js"],
    modules: [
      path.resolve(__dirname, "../node_modules"),
      path.resolve(process.cwd(), "./node_modules"),
    ],
  },
  resolveLoader: {
    modules: [
      path.resolve(__dirname, "../node_modules"),
      path.resolve(process.cwd(), "./node_modules"),
    ],
  },
};
