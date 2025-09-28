const path = require("node:path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ReactServerWebpackPlugin = require("react-server-dom-webpack/plugin");

const mode = process.env.NODE_ENV || "development";
const development = mode === "development";

const config = {
    mode,
    entry: "./src/Client.jsx",
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                use: "babel-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
            },
        ],
    },
    resolve: {
        extensions: [".js", ".jsx"],
    },
    plugins: [
        new HtmlWebpackPlugin({
            inject: true,
            publicPath: "/", // HTML will reference assets from /assets/
            template: "./index.html",
        }),
        new ReactServerWebpackPlugin({ isServer: false }),
    ],
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "assets/[name].js", // move JS into dist/assets/
        chunkFilename: development
            ? "assets/[id].chunk.js"
            : "assets/[id].[contenthash].chunk.js", // chunks also in dist/assets/
        clean: true,
        publicPath: "/", // served from root, but HtmlWebpackPlugin will prepend /assets/
    },
    optimization: {
        runtimeChunk: "single",
    },
};

module.exports = config;

