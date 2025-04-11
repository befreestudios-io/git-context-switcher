/**
 * Process Execution Testing Utilities
 * 
 * This module provides mock functions and utilities for testing
 * process execution and command operations.
 */
import { jest } from '@jest/globals';

// Create mock functions for child_process methods
export const mockExec = jest.fn();
export const mockExecSync = jest.fn();

/**
 * Set up child_process mocks for a test file
 */
export function setupExecMocks() {
  // Mock child_process module
  jest.mock('child_process', () => ({
    exec: mockExec,
    execSync: mockExecSync
  }));

  // Mock util.promisify to return our mockExec directly
  jest.mock('util', () => ({
    promisify: jest.fn(() => mockExec)
  }));
}

/**
 * Reset all exec mocks
 */
export function resetExecMocks() {
  mockExec.mockReset();
  mockExecSync.mockReset();
}

/**
 * Mock successful command execution
 * @param {string} stdout Output to return
 * @returns {Function} Configured mock function
 */
export function mockSuccessfulExec(stdout = '') {
  return mockExec.mockResolvedValue({ stdout });
}

/**
 * Mock failed command execution
 * @param {string} message Error message
 * @returns {Function} Configured mock function
 */
export function mockFailedExec(message = 'Command failed') {
  return mockExec.mockRejectedValue(new Error(message));
}

/**
 * Mock Git installation check
 * @param {boolean} installed Whether Git should appear to be installed
 */
export function mockGitInstalled(installed = true) {
  if (installed) {
    mockExec.mockResolvedValue({ stdout: 'git version 2.30.1' });
  } else {
    mockExec.mockRejectedValue(new Error('Command not found: git'));
  }
}

/**
 * Mock Git config output
 * @param {string} config Git config content to return
 */
export function mockGitConfig(config = 'user.name=Test\nuser.email=test@example.com') {
  mockExec.mockResolvedValue({ stdout: config });
}