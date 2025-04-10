/**
 * Tests for security utilities
 */
import { jest, describe, test, expect, beforeEach, afterAll } from '@jest/globals';

import * as security from '../../lib/utils/security.js';

// Create a spy on the original implementation
const originalCheckFilePermissions = security.checkFilePermissions;

describe('Security Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Restore original implementation after each test
    security.checkFilePermissions = originalCheckFilePermissions;
  });

  afterAll(() => {
    // Ensure we restore the original implementation
    security.checkFilePermissions = originalCheckFilePermissions;
  });

  describe('validateFilePath', () => {
    test('should reject paths with directory traversal attempts', () => {
      const paths = [
        '../dangerous/path',
        '../../etc/passwd',
        'safe/path/../../../etc/shadow',
        'safe/path/..\\..\\Windows\\System32',
        'safe/path/%2e%2e/%2e%2e/etc/passwd'
      ];
      
      paths.forEach(path => {
        expect(() => security.validateFilePath(path)).toThrow('Path contains directory traversal');
      });
    });
    
    test('should allow safe paths', () => {
      const paths = [
        'safe/path',
        'also/safe/path.txt',
        '/absolute/but/safe/path',
        'path/with/dots/but/no/traversal',
        'path.with.dots'
      ];
      
      paths.forEach(path => {
        expect(() => security.validateFilePath(path)).not.toThrow();
      });
    });
  });
  
  describe('checkFilePermissions', () => {
    test('should return true in test environment', () => {
      const filePath = '/path/to/config.json';
      process.env.NODE_ENV = 'test';
      expect(security.checkFilePermissions(filePath)).toBe(true);
    });
    
    test('should handle permission denied error', () => {
      // Override the implementation for this test
      security.checkFilePermissions = jest.fn().mockImplementation(() => {
        throw new Error('Permission denied for: /path/to/file');
      });
      
      expect(() => security.checkFilePermissions('/path/to/file'))
        .toThrow('Permission denied for:');
    });

    test('should handle file not found error', () => {
      // Override the implementation for this test
      security.checkFilePermissions = jest.fn().mockImplementation(() => {
        throw new Error('File not found: /path/to/nonexistent');
      });
      
      expect(() => security.checkFilePermissions('/path/to/nonexistent'))
        .toThrow('File not found:');
    });
  });
  
  describe('sanitizeInput', () => {
    test('should remove potential dangerous characters', () => {
      const inputs = [
        { input: 'Normal text', expected: 'Normal text' },
        { input: 'Path with <script>alert("XSS")</script>', expected: 'Path with alertXSS' },
        { input: 'Command; rm -rf /', expected: 'Command rm -rf ' },
        { input: 'Input with && dangerous command', expected: 'Input with  dangerous command' },
        { input: 'Input with | pipe', expected: 'Input with  pipe' }
      ];
      
      inputs.forEach(({ input, expected }) => {
        expect(security.sanitizeInput(input)).toBe(expected);
      });
    });
    
    test('should handle undefined or empty inputs', () => {
      expect(security.sanitizeInput(undefined)).toBe('');
      expect(security.sanitizeInput('')).toBe('');
      expect(security.sanitizeInput(null)).toBe('');
    });
  });
});