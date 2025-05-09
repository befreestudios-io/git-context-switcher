/**
 * File System Testing Utilities
 *
 * This module provides mock functions and utilities for testing
 * file system operations across the codebase.
 */
import { jest } from "@jest/globals";

// Create mock functions for fs methods
export const mockAccessSync = jest.fn();
export const mockPathExists = jest.fn();
export const mockPathExistsSync = jest.fn();
export const mockEnsureDir = jest.fn();
export const mockEnsureDirSync = jest.fn();
export const mockMkdir = jest.fn();
export const mockMkdirSync = jest.fn();
export const mockStatSync = jest.fn();
export const mockWriteFileSync = jest.fn();
export const mockOutputFileSync = jest.fn();
export const mockCopy = jest.fn();
export const mockReadFile = jest.fn();
export const mockWriteFile = jest.fn();
export const mockReadJson = jest.fn();
export const mockWriteJson = jest.fn();
export const mockUnlink = jest.fn();
export const mockRemove = jest.fn();
export const mockAccess = jest.fn();
export const mockRenameSync = jest.fn();

// Mock the entire fs module
export const mockFs = {
  accessSync: mockAccessSync,
  access: mockAccess,
  pathExists: mockPathExists,
  pathExistsSync: mockPathExistsSync,
  ensureDir: mockEnsureDir,
  ensureDirSync: mockEnsureDirSync,
  mkdir: mockMkdir,
  mkdirSync: mockMkdirSync,
  statSync: mockStatSync,
  writeFileSync: mockWriteFileSync,
  outputFileSync: mockOutputFileSync,
  copy: mockCopy,
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  readJson: mockReadJson,
  writeJson: mockWriteJson,
  unlink: mockUnlink,
  remove: mockRemove,
  existsSync: mockPathExistsSync, // Alias for compatibility
  renameSync: mockRenameSync,
  constants: {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
  },
};

/**
 * Set up fs mocks for a test file
 * @returns {Object} The mock fs module
 */
export function setupFsMocks() {
  // Mock fs-extra module
  jest.mock("fs-extra", () => mockFs);

  // Mock fs module with more complete methods
  jest.mock("fs", () => ({
    accessSync: mockAccessSync,
    access: mockAccess,
    mkdirSync: mockMkdirSync,
    statSync: mockStatSync,
    writeFileSync: mockWriteFileSync,
    existsSync: mockPathExistsSync,
    renameSync: mockRenameSync,
    constants: mockFs.constants,
  }));

  return mockFs;
}

/**
 * Reset all file system mocks
 */
export function resetFsMocks() {
  Object.values(mockFs).forEach((mock) => {
    if (typeof mock === "function") {
      mock.mockReset();
    }
  });
}

/**
 * Mock successful file existence checks
 */
export function mockFileExists() {
  mockPathExists.mockResolvedValue(true);
  mockPathExistsSync.mockReturnValue(true);
  mockAccessSync.mockImplementation(() => true);
  mockAccess.mockImplementation((path, mode, callback) => {
    if (callback) callback(null);
    return Promise.resolve();
  });
  mockStatSync.mockImplementation(() => ({ isDirectory: () => false }));
}

/**
 * Mock successful directory existence checks
 */
export function mockDirExists() {
  mockPathExists.mockResolvedValue(true);
  mockPathExistsSync.mockReturnValue(true);
  mockAccessSync.mockImplementation(() => true);
  mockAccess.mockImplementation((path, mode, callback) => {
    if (callback) callback(null);
    return Promise.resolve();
  });
  mockStatSync.mockImplementation(() => ({ isDirectory: () => true }));
}

/**
 * Mock file not found scenarios
 */
export function mockFileNotFound() {
  const error = new Error("File not found");
  error.code = "ENOENT";

  mockPathExists.mockResolvedValue(false);
  mockPathExistsSync.mockReturnValue(false);
  mockAccessSync.mockImplementation(() => {
    throw error;
  });
  mockAccess.mockImplementation((path, mode, callback) => {
    if (callback) callback(error);
    return Promise.reject(error);
  });
  mockStatSync.mockImplementation(() => {
    throw error;
  });
}

/**
 * Mock permission denied scenarios
 */
export function mockPermissionDenied() {
  const error = new Error("Permission denied");
  error.code = "EACCES";

  mockAccessSync.mockImplementation(() => {
    throw error;
  });
  mockAccess.mockImplementation((path, mode, callback) => {
    if (callback) callback(error);
    return Promise.reject(error);
  });
}

/**
 * Mock successful file operations
 */
export function mockSuccessfulFileOps() {
  mockMkdir.mockResolvedValue(undefined);
  mockEnsureDir.mockResolvedValue(undefined);
  mockWriteFile.mockResolvedValue(undefined);
  mockReadFile.mockResolvedValue("mock file content");
  mockCopy.mockResolvedValue(undefined);
  mockRemove.mockResolvedValue(undefined);
  mockReadJson.mockResolvedValue([]);
  mockWriteJson.mockResolvedValue(undefined);

  // Sync versions
  mockMkdirSync.mockReturnValue(undefined);
  mockEnsureDirSync.mockReturnValue(undefined);
  mockWriteFileSync.mockReturnValue(undefined);
  mockOutputFileSync.mockReturnValue(undefined);
  mockRenameSync.mockReturnValue(undefined);
}
