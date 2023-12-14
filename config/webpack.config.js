const { stat } = require("fs/promises");
const path = require("path");
// const { VueLoaderPlugin } = require("vue-loader");
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
              require.resolve("style-loader"),
              {
                loader: require.resolve("css-loader"),
                options: {
                  modules: true,
                  importLoaders: 1,
                },
              },

              {
                loader: require.resolve("postcss-loader"),
                options: {
                  postcssOptions: {
                    plugins: [["postcss-preset-env"]],
                  },
                },
              },
              require.resolve("sass-loader"),
            ],
          },
          {
            test: /\.(css|scss)$/,
            use: [
              require.resolve("style-loader"),
              //   require.resolve("vue-style-loader"),
              require.resolve("css-loader"),
              {
                loader: require.resolve("postcss-loader"),
                options: {
                  postcssOptions: {
                    plugins: [[require.resolve("postcss-preset-env")]],
                  },
                },
              },
              require.resolve("sass-loader"),
            ],
          },
        ],
      },
      //   {
      //     test: /\.vue$/,
      //     loader: "vue-loader",
      //   },

      {
        test: /\.(js|mjs|jsx|ts|tsx)$/,
        loader: require.resolve("babel-loader"),
        options: {
          presets: [
            require.resolve("@babel/preset-react"),
            require.resolve("@babel/preset-typescript"),
          ],
        },
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
