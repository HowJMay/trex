/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__spec__/**/*.spec.ts'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
};
