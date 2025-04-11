/**
 * Path and Environment Testing Utilities
 * 
 * This module provides mock functions and utilities for testing
 * path operations and environment-dependent code.
 */
import { jest } from '@jest/globals';

// Store original environment variables
const originalEnv = { ...process.env };
const originalCwd = process.cwd;

// Create mock functions for os methods
export const mockHomedir = jest.fn().mockReturnValue('/home/user');

/**
 * Set up path and environment mocks for a test file
 */
export function setupPathMocks() {
  // Mock os module
  jest.mock('os', () => ({
    homedir: mockHomedir
  }));
}

/**
 * Reset all path and environment mocks
 */
export function resetPathMocks() {
  mockHomedir.mockReset().mockReturnValue('/home/user');
  process.env = { ...originalEnv };
  process.cwd = originalCwd;
}

/**
 * Set a mock working directory for the test
 * @param {string} dir Directory path to use
 */
export function mockWorkingDirectory(dir) {
  process.cwd = jest.fn().mockReturnValue(dir);
}

/**
 * Set a mock home directory for the test
 * @param {string} dir Home directory path to use
 */
export function mockHomeDirectory(dir = '/home/user') {
  mockHomedir.mockReturnValue(dir);
}

/**
 * Set process.env.NODE_ENV for testing
 * @param {string} env Environment to use (test, development, production)
 */
export function setTestEnvironment(env = 'test') {
  process.env.NODE_ENV = env;
}

/**
 * Restore the original environment after tests
 */
export function restoreEnvironment() {
  process.env = { ...originalEnv };
  process.cwd = originalCwd;
}