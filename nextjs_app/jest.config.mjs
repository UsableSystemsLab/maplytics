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
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'components/**/*.{js,jsx}',
    'lib/**/*.{js,jsx}',
    'hooks/**/*.{js,jsx}',
    '!components/ui/**',
    '!components/BoundaryMap.jsx',
    '!components/ComparisonMap.jsx',
    '!components/HeroSection.jsx',
    '!components/AuthMapBackground.jsx',
    '!components/MapComponent.jsx',
    '!components/MapArea.jsx',
    '!components/SearchableSelect.jsx',
    '!components/ChoroplethRender.jsx',
    '!components/ChoroplethMap.jsx',
    '!components/ComparisonHistoryStrip.jsx',
    '!components/ComparisonMapCard.jsx',
    '!components/DatasetMultiPicker.jsx',
    '!components/MapCommandInput.jsx',
    '!components/MapExplorer.jsx',
    '!components/MapLayerPanel.jsx',
    '!components/MapResultPreview.jsx',
    '!components/MapResultsSidebar.jsx',
    '!components/MapSummaryPanel.jsx',
    '!hooks/use-map-sync.js',
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
