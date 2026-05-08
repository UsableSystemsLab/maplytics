import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './',
})

/** @type {import('jest').Config} */
const config = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^leaflet$': '<rootDir>/__mocks__/leaflet.js',
    '^leaflet/(.*)$': '<rootDir>/__mocks__/leaflet.js',
    '^vega-embed$': '<rootDir>/__mocks__/vega-embed.js',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'components/**/*.{js,jsx}',
    'lib/**/*.{js,jsx}',
    '!components/ui/**',
    '!lib/apiClient.js',
    '!lib/*Api.js',
    '!lib/firebase.js',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  coverageReporters: ['text', 'json-summary', 'lcov'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/components/__tests__/testUtils.js',
  ],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30,
    },
  },
}
export default createJestConfig(config)
