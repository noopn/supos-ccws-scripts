/** @type {import('jest').Config} */

const config = {
  roots: ['<rootDir>/src'],
  testEnvironment: "jsdom",
  globals: {
    diagnostics: false,
  },
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": "ts-jest"
  },
  moduleNameMapper: {
    "\\.(s?css|less)$": "identity-obj-proxy",
    "\\.(png|jpg|svg)$": "<rootDir>/__mocks__/fileMock.js",
  },
  preset: "ts-jest",
};

module.exports = config;
