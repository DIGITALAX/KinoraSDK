const webpack = require("webpack");
const path = require("path");
const dotenv = require("dotenv");
const DeclarationBundlerPlugin = require("typescript-declaration-webpack-plugin");

const env = dotenv.config().parsed;

module.exports = {
  entry: "./src/index.ts",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "",
    libraryTarget: "umd",
    globalObject: "this",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: [/(node_modules)/],
        use: [
          {
            loader: "ts-loader",
          },
        ],
      },
      {
        test: /\.d\.ts$/,
        use: "ignore-loader",
      },
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
      },
    ],
  },
  resolve: {
    modules: ["node_modules"],
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
  plugins: [
    new webpack.DefinePlugin({
      "process.env": JSON.stringify(env),
    }),
    new DeclarationBundlerPlugin({
      moduleName: "kinora-sdk",
      out: "./index.d.ts",
    }),
    new webpack.IgnorePlugin({ resourceRegExp: /^esbuild$/ }),
  ],
  devtool: false,
  mode: "development",
  externals: {
    esbuild: "esbuild commonjs",
  },
};
