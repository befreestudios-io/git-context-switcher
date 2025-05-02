/**
 * Jest setup file for ES modules support
 */

// Import Jest globals
import { jest } from "@jest/globals";

// Set test environment
process.env.NODE_ENV = "test";

// Import test utilities
import {
  mockAccessSync,
  mockAccess,
  mockPathExists,
  mockFs,
} from "./utils/testUtils/fsTestUtils.js";

import { mockExec, mockExecSync } from "./utils/testUtils/execTestUtils.js";

import { mockHomedir } from "./utils/testUtils/pathTestUtils.js";

// Make jest available globally - helps with ES module mocking
global.jest = jest;

// Create manual mocks for our modules
const mockSanitizeInput = jest.fn((input) => input || "");
const mockPathPatternToRegex = jest.fn((pattern) => new RegExp(pattern));
const mockContextFromObject = jest.fn((obj) => obj);
const mockValidatePathSafety = jest.fn(() => true);

// Set up mock modules
jest.mock("../lib/utils/security.js", () => ({
  sanitizeInput: mockSanitizeInput,
  validatePathSafety: mockValidatePathSafety,
  validateContextName: jest.fn((name) => name && name.length > 0),
  validateEmail: jest.fn((email) => email && email.includes("@")),
  validatePathPattern: jest.fn((pattern) => pattern && pattern.length > 0),
  validateFilePath: jest.fn((path) => {
    if (path && path.includes(".."))
      throw new Error("Path contains directory traversal");
    return true;
  }),
  checkFilePermissions: jest.fn(() => true),
}));

// Store a reference to the mock function for export
const mockGetStandardPaths = jest.fn().mockReturnValue({
  homeDir: "/mock/home",
  gitConfigPath: "/mock/home/.gitconfig",
  gitConfigDirPath: "/mock/home/.gitconfig.d",
  configFilePath: "/mock/home/.gitconfig.d/contexts.json",
});

jest.mock("../lib/utils/pathUtils.js", () => ({
  pathPatternToRegex: mockPathPatternToRegex,
  expandPath: jest.fn((path, testHomeDir) => {
    if (!path) return path;
    return path.startsWith("~")
      ? path.replace(/^~/, testHomeDir || mockHomedir())
      : path;
  }),
  matchPath: jest.fn((currentPath, pattern, testHomeDir) => {
    if (!currentPath || !pattern) return false;
    const expandedPattern = pattern.startsWith("~")
      ? pattern.replace(/^~/, testHomeDir || mockHomedir())
      : pattern;
    return currentPath.startsWith(expandedPattern.replace(/\*\*?/g, ""));
  }),
  createFullPath: jest.fn((base, rel) => (rel ? `${base}/${rel}` : base)),
  getStandardPaths: mockGetStandardPaths,
}));

jest.mock("../lib/models/Context.js", () => ({
  Context: {
    fromObject: mockContextFromObject,
  },
}));

// Mock external modules
jest.mock("fs-extra", () => mockFs);
jest.mock("fs", () => ({
  accessSync: mockAccessSync,
  access: mockAccess,
  constants: {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
  },
}));

// Fix promisify by providing mocks that work with it
const originalUtil = jest.requireActual("util");
jest.mock("util", () => ({
  ...originalUtil, // Keep original util functions like inherits
  promisify: jest.fn((fn) => {
    if (fn === mockAccess) {
      return jest.fn().mockResolvedValue(undefined);
    }
    return fn;
  }),
}));

jest.mock("child_process", () => ({
  exec: mockExec,
  execSync: mockExecSync,
}));

// Create a more comprehensive mock for the 'os' module
jest.mock("os", () => ({
  homedir: mockHomedir,
  platform: jest.fn().mockReturnValue("darwin"), // Mock platform as macOS by default
  tmpdir: jest.fn().mockReturnValue("/tmp"), // Add mock tmpdir function
  EOL: "\n", // Add EOL constant
  // Add these additional properties that tmp package might use
  constants: {
    errno: {
      EBADF: 9,
      EEXIST: 17,
      EISDIR: 21,
      ENOENT: 2,
      ENOTDIR: 20,
      ENOTEMPTY: 66,
    },
  },
  type: jest.fn().mockReturnValue("Darwin"),
  release: jest.fn().mockReturnValue("21.6.0"),
  tmpDir: jest.fn().mockReturnValue("/tmp"),
  hostname: jest.fn().mockReturnValue("jest-test-host"),
}));

// Mock the 'tmp' package directly to avoid issues with its dependencies
jest.mock("tmp", () => ({
  fileSync: jest.fn(() => ({
    name: "/tmp/mock-tmp-file",
    fd: 123,
    removeCallback: jest.fn(),
  })),
  dirSync: jest.fn(() => ({
    name: "/tmp/mock-tmp-dir",
    removeCallback: jest.fn(),
  })),
  setGracefulCleanup: jest.fn(),
}));

// Add a mock for process.on to prevent teardown issues
const originalProcessOn = process.on;
process.on = jest.fn((event, listener) => {
  if (event === "exit") {
    // Don't actually attach exit handlers in tests
    return process;
  }
  return originalProcessOn.call(process, event, listener);
});

// Set additional Jest configurations if needed
jest.setTimeout(10000); // Set timeout for tests

// Export mock functions for use in tests
export {
  // Security utils mocks
  mockSanitizeInput,
  mockValidatePathSafety,

  // Path utils mocks
  mockPathPatternToRegex,
  mockHomedir,
  mockGetStandardPaths as getStandardPaths,

  // Model mocks
  mockContextFromObject,

  // File system mocks
  mockFs,
  mockAccessSync,
  mockAccess,
  mockPathExists,

  // Process execution mocks
  mockExec,
  mockExecSync,
};
