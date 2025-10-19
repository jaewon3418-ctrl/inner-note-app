const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure resolver settings
config.resolver = {
  ...config.resolver,
  assetExts: [...(config.resolver?.assetExts || []), 'bin', 'txt', 'jpg', 'png', 'json'],
  sourceExts: [...(config.resolver?.sourceExts || []), 'jsx', 'js', 'ts', 'tsx', 'json'],
};

module.exports = config;