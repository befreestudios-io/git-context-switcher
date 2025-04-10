/**
 * Tests for security utilities
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import * as security from '../../lib/utils/security.js';

// Create mock functions
const mockAccessSync = jest.fn();

// Mock fs module
jest.mock('fs', () => ({
  accessSync: (...args) => mockAccessSync(...args),
  constants: { F_OK: 4, R_OK: 2, W_OK: 1 }
}));


describe('Security Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccessSync.mockReset();
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
    test('should verify file exists and is readable', () => {
      const filePath = '/path/to/config.json';
      
      // Configure mock to not throw error
      mockAccessSync.mockImplementation(() => true);
      
      expect(() => security.checkFilePermissions(filePath)).not.toThrow();
      expect(mockAccessSync).toHaveBeenCalledWith(filePath, expect.any(Number));
    });
    
    test('should throw if file does not exist or has wrong permissions', () => {
      const filePath = '/path/to/inaccessible.json';
      
      // Configure mock to throw error
      const error = new Error('EACCES: permission denied');
      error.code = 'EACCES';
      mockAccessSync.mockImplementation(() => { throw error; });
      
      expect(() => security.checkFilePermissions(filePath)).toThrow();
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