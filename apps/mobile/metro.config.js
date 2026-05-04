const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
const rendererReactPath = path.resolve(__dirname, "node_modules/react");

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  react: rendererReactPath,
  "react/jsx-runtime": path.join(rendererReactPath, "jsx-runtime.js"),
  "react/jsx-dev-runtime": path.join(
    rendererReactPath,
    "jsx-dev-runtime.js"
  ),
  "react/compiler-runtime": path.join(
    rendererReactPath,
    "compiler-runtime.js"
  ),
};

// Treat vendored KaTeX/markdown-it bundles (stored as .txt to avoid Metro
// parsing them as source) as binary assets so expo-asset can load them.
config.resolver.assetExts = [...config.resolver.assetExts, "txt"];

module.exports = withNativeWind(config, { input: "./src/global.css" });
