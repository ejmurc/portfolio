import path from "path";
import { fileURLToPath } from "url";
import HTMLWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
	mode: "production",
	entry: "./src/app.ts",
	output: {
		path: path.resolve(__dirname, "public"),
		filename: "bundle.js",
		clean: true,
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: "ts-loader",
				exclude: /node_modules/,
			},
			{
				test: /\.css$/,
				use: [MiniCssExtractPlugin.loader, "css-loader"],
			},
		],
	},
	resolve: {
		extensions: [".ts", ".js"],
	},
	plugins: [
		new HTMLWebpackPlugin({
			template: "./src/index.html",
			minify: true,
		}),
		new MiniCssExtractPlugin({
			filename: "styles.css",
		}),
	],
};
