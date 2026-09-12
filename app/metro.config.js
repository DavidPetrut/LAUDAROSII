const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const videoExts = ["mp4", "mov", "m4v", "webm", "mkv"];
config.resolver.assetExts = Array.from(
  new Set([...config.resolver.assetExts, ...videoExts])
);

module.exports = config;
