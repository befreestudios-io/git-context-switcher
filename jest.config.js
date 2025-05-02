/**
 * Jest configuration for Git Context Switcher
 */
export default {
  // Test environment
  testEnvironment: "node",
  // Module file extensions
  moduleFileExtensions: ["js", "json", "node"],
  // Module name mapper for ES modules
  moduleNameMapper: {
    "^../../lib/utils/security.js$": "<rootDir>/lib/utils/security.js",
  },
  // Transforms
  transform: {},
  // Code coverage configuration
  collectCoverage: true,
  collectCoverageFrom: ["lib/**/*.js"],
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text-summary"],
  // Test files pattern
  testMatch: ["**/__tests__/**/*.test.js"],
  // Setup files
  setupFilesAfterEnv: ["./__tests__/setup.js"],
  // Verbose output
  verbose: true,
  // Ensure modules are processed correctly
  transformIgnorePatterns: ["node_modules/(?!(.*))"],
};
