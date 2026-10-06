/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Jest setup for component tests.
 *
 * Reanimated ships an official jest mock that implements the hooks and helpers
 * used across the motion system (useSharedValue, useAnimatedStyle, withTiming,
 * withSpring, withRepeat/Sequence/Delay, cancelAnimation, runOnJS, Easing,
 * ReduceMotion, createAnimatedComponent). Using it keeps component tests free of
 * any UI-thread/native code while still exercising the real component trees.
 */
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// gesture-handler's jest setup registers its native module mocks.
require('react-native-gesture-handler/jestSetup');

/**
 * `react-native-maps` 1.27 resolves its TurboModule at **import time**
 * (`TurboModuleRegistry.getEnforcing('RNMapsAirModule')`), so merely importing a
 * screen that renders a map throws under jest. 1.14 did not, which is why this
 * mock arrived with the SDK 57 upgrade rather than with the screens.
 *
 * The mock is a plain view, deliberately: these tests exist to prove a screen
 * mounts without throwing, and a real map cannot render in this environment at
 * all. Whether the map itself works is a question only a device answers.
 */
jest.mock('react-native-maps', () => {
  const react = require('react');
  const { View } = require('react-native');
  const passthrough = (props: { children?: unknown }) =>
    react.createElement(View, null, props.children);

  return {
    __esModule: true,
    default: passthrough,
    MapView: passthrough,
    Marker: passthrough,
    Polyline: passthrough,
    Callout: passthrough,
    PROVIDER_GOOGLE: 'google',
    PROVIDER_DEFAULT: 'default',
  };
});
