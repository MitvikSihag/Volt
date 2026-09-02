// ponytail: tests cover pure TS modules only, so plain babel-jest beats jest-expo's full RN harness.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/**/*.test.ts'],
  transform: { '^.+\\.tsx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
