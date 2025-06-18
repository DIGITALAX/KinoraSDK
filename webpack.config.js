const path = require("path");
const dotenv = require("dotenv");
const webpack = require("webpack");
const Dotenv = require("dotenv-webpack");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const env = dotenv.config().parsed;

module.exports = {
  entry: "./src/index.ts",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "/",
    libraryTarget: "umd",
  },
  performance: {
    hints: false,
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: "tsconfig.json",
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.map$/,
        use: "ignore-loader",
      },
    ],
  },
  devtool: false,
  resolve: {
    modules: ["node_modules", "src"],
    extensions: [".tsx", ".ts", ".js"],
    fallback: {
      stream: require.resolve("stream-browserify"),
      path: require.resolve("path-browserify"),
      tty: require.resolve("tty-browserify"),
      http: require.resolve("stream-http"),
      crypto: require.resolve("crypto-browserify"),
      https: require.resolve("https-browserify"),
      zlib: require.resolve("browserify-zlib"),
      child_process: false,
      fs: false,
      os: require.resolve("os-browserify/browser"),
      pnpapi: false,
      worker_threads: false,
    },
  },
  ignoreWarnings: [
    /Failed to parse source map/,
    /Critical dependency: require function is used/,
  ],
  plugins: [
    new Dotenv({
      path: path.resolve(__dirname, ".env"),
    }),
    new webpack.DefinePlugin({
      self: "global",
    }),
    new CleanWebpackPlugin(),
  ],
  mode: "production",
  externals: {
    react: "react",
    "react-dom": "react-dom",
  },
};
