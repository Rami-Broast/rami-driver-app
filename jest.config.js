/**
 * Jest config for React Native COMPONENT tests (jest-expo).
 *
 * These mount the motion components and the two hero components in a simulated
 * RN environment and assert they render without throwing — the "no crashes at
 * mount" guarantee for the view layer. Reanimated is swapped for its official
 * jest mock so no native/UI-thread code runs. The correctness-critical logic is
 * covered separately and more exhaustively by the pure tests in
 * `jest.logic.config.js`.
 */
module.exports = {
  preset: 'jest-expo',
  // Reanimated 4 is a thin layer over `react-native-worklets`, whose `.native`
  // entry point installs native bindings at import time and throws under jest.
  // The resolver the package ships strips the `.native` extensions for its own
  // files, which is what makes the official mock importable at all.
  resolver: 'react-native-worklets/jest/resolver',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  roots: ['<rootDir>/test/components'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated|react-native-worklets|react-native-gesture-handler))',
  ],
};
