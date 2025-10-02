const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = (env, argv) => {
  const isProduction = argv.mode === "production";

  return {
    entry: "./src/main.js",
    output: {
      filename: isProduction ? "bundle.[contenthash].js" : "bundle.js",
      path: path.resolve(__dirname, "dist"),
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"]
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./src/index.html",
        inject: "body",
        scriptLoading: "blocking"
      })
    ],
    resolve: {
      extensions: [".js"]
    },
    devtool: isProduction ? "source-map" : "eval-source-map",
    devServer: {
      static: {
        directory: path.resolve(__dirname, "dist")
      },
      port: 5173,
      host: "0.0.0.0",
      historyApiFallback: true
    }
  };
};
