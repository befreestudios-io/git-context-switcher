/**
 * File System Testing Utilities
 * 
 * This module provides mock functions and utilities for testing
 * file system operations across the codebase.
 */
import { jest } from '@jest/globals';

// Create mock functions for fs methods
export const mockAccessSync = jest.fn();
export const mockPathExists = jest.fn();
export const mockEnsureDir = jest.fn();
export const mockMkdir = jest.fn();
export const mockCopy = jest.fn();
export const mockReadFile = jest.fn();
export const mockWriteFile = jest.fn();
export const mockReadJson = jest.fn();
export const mockWriteJson = jest.fn();
export const mockUnlink = jest.fn();
export const mockRemove = jest.fn();
export const mockAccess = jest.fn();

// Mock the entire fs module
export const mockFs = {
  accessSync: mockAccessSync,
  access: mockAccess,
  pathExists: mockPathExists,
  ensureDir: mockEnsureDir,
  mkdir: mockMkdir,
  copy: mockCopy,
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  readJson: mockReadJson,
  writeJson: mockWriteJson,
  unlink: mockUnlink,
  remove: mockRemove,
  constants: { 
    F_OK: 0,
    R_OK: 4, 
    W_OK: 2, 
    X_OK: 1 
  }
};

/**
 * Set up fs mocks for a test file
 * @returns {Object} The mock fs module
 */
export function setupFsMocks() {
  // Mock fs-extra module
  jest.mock('fs-extra', () => mockFs);
  
  // Mock fs module
  jest.mock('fs', () => ({
    accessSync: mockAccessSync,
    constants: mockFs.constants
  }));
  
  return mockFs;
}

/**
 * Reset all file system mocks
 */
export function resetFsMocks() {
  Object.values(mockFs).forEach(mock => {
    if (typeof mock === 'function') {
      mock.mockReset();
    }
  });
}

/**
 * Mock successful file existence checks
 */
export function mockFileExists() {
  mockPathExists.mockResolvedValue(true);
  mockAccessSync.mockImplementation(() => true);
}

/**
 * Mock file not found scenarios
 */
export function mockFileNotFound() {
  const error = new Error('File not found');
  error.code = 'ENOENT';
  
  mockPathExists.mockResolvedValue(false);
  mockAccessSync.mockImplementation(() => { throw error; });
}

/**
 * Mock permission denied scenarios
 */
export function mockPermissionDenied() {
  const error = new Error('Permission denied');
  error.code = 'EACCES';
  
  mockAccessSync.mockImplementation(() => { throw error; });
}