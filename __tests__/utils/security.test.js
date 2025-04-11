/**
 * Tests for security utilities
 */
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as security from '../../lib/utils/security.js';

// For ES modules we need to mock entire modules rather than individual functions
jest.unstable_mockModule('fs', () => ({
  accessSync: jest.fn(),
  constants: { F_OK: 0, R_OK: 4, W_OK: 2, X_OK: 1 }
}));

describe('Security Utils', () => {
  let originalNodeEnv;
  let mockFs;
  
  beforeEach(async () => {
    // Get the mock fs module
    mockFs = await import('fs');
    
    // Store original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore NODE_ENV after each test
    process.env.NODE_ENV = originalNodeEnv;
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
      // Set test environment
      process.env.NODE_ENV = 'test';
      
      const filePath = '/path/to/config.json';
      const result = security.checkFilePermissions(filePath);
      
      expect(result).toBe(true);
    });
  });

  // Note: We're separating these production tests because we need to test security.js's 
  // direct implementation, which we can't easily mock in ESM context
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