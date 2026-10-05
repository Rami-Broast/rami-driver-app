/**
 * Jest config for the PURE logic layer (motion tokens, reduced-motion, the
 * order-status and payment-state models).
 *
 * These modules import nothing from React Native, so they run under plain
 * ts-jest in Node — fast, and independent of the RN/Expo toolchain. This is the
 * layer that carries the correctness-critical logic, and it is always testable.
 * Component (RN) tests live under `jest.config.js` (jest-expo).
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/unit'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
};
