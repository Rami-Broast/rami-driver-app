module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // The worklets plugin MUST be listed last. It rewrites worklets so
      // animations run on the UI thread; without it, animated components throw
      // at runtime. Keeping it here (not scattered) is part of the "no crashes"
      // guarantee for the motion system.
      //
      // It moved: from Reanimated 4 this lives in `react-native-worklets`, and
      // `react-native-reanimated/plugin` is now a one-line re-export of it.
      // Naming the real package means the day that shim is dropped is not the
      // day every animation silently stops working.
      'react-native-worklets/plugin',
    ],
  };
};
