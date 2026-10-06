// Default Expo Metro config. Kept explicit so bundler tweaks have a home.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
