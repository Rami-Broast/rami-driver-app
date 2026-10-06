module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaFeatures: { jsx: true }, ecmaVersion: 2021, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  settings: { react: { version: 'detect' } },
  env: { es2021: true, node: true },
  rules: {
    // The classic RN entry point doesn't need React in scope, and TS covers props.
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
  overrides: [
    {
      files: ['test/**/*.{ts,tsx}'],
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'babel.config.js',
    'metro.config.js',
    'jest.config.js',
    'jest.logic.config.js',
    '.eslintrc.js',
    'dist/',
  ],
};
