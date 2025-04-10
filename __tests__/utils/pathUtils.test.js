/**
 * Tests for pathUtils functions
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import * as path from 'path';
import * as pathUtils from '../../lib/utils/pathUtils.js';

// Create a homedir mock function that we can control
const mockedHomedir = jest.fn().mockReturnValue('/home/user');

// Mock os module
jest.mock('os', () => ({
  homedir: () => mockedHomedir()
}));

// Import os after mocking
import * as os from 'os';

describe('pathUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset homedir mock to default value
    mockedHomedir.mockReturnValue('/home/user');
  });

  describe('expandPath', () => {
    test('should expand tilde to home directory', () => {
      const result = pathUtils.expandPath('~/projects');
      expect(result).toBe('/home/user/projects');
      expect(mockedHomedir).toHaveBeenCalled();
    });

    test('should not modify absolute paths', () => {
      const absolutePath = '/absolute/path';
      const result = pathUtils.expandPath(absolutePath);
      expect(result).toBe(absolutePath);
    });

    test('should not modify relative paths without tilde', () => {
      const relativePath = 'relative/path';
      const result = pathUtils.expandPath(relativePath);
      expect(result).toBe(relativePath);
    });

    test('should handle just tilde', () => {
      const result = pathUtils.expandPath('~');
      expect(result).toBe('/home/user');
    });

    test('should handle undefined or empty paths', () => {
      expect(pathUtils.expandPath(undefined)).toBe(undefined);
      expect(pathUtils.expandPath('')).toBe('');
    });

    test('should handle paths with tilde in the middle', () => {
      const path = 'path/with/~/tilde';
      const result = pathUtils.expandPath(path);
      expect(result).toBe(path);
    });
  });

  describe('matchPath', () => {
    test('should match exact paths', () => {
      const currentPath = '/projects/work';
      const pattern = '/projects/work';
      
      const result = pathUtils.matchPath(currentPath, pattern);
      
      expect(result).toBe(true);
    });

    test('should match paths with wildcards', () => {
      const currentPath = '/projects/work/feature-1';
      const pattern = '/projects/work/*';
      
      const result = pathUtils.matchPath(currentPath, pattern);
      
      expect(result).toBe(true);
    });

    test('should expand tilde in patterns', () => {
      mockedHomedir.mockReturnValue('/home/developer');
      
      const currentPath = '/home/developer/projects';
      const pattern = '~/projects';
      
      const result = pathUtils.matchPath(currentPath, pattern);
      
      expect(result).toBe(true);
      expect(mockedHomedir).toHaveBeenCalled();
    });

    test('should not match when paths differ', () => {
      const currentPath = '/projects/personal';
      const pattern = '/projects/work';
      
      const result = pathUtils.matchPath(currentPath, pattern);
      
      expect(result).toBe(false);
    });

    test('should handle pattern with double wildcards', () => {
      const currentPath = '/projects/work/feature-1/src/components';
      const pattern = '/projects/work/**';
      
      const result = pathUtils.matchPath(currentPath, pattern);
      
      expect(result).toBe(true);
    });

    test('should return false for undefined or empty values', () => {
      expect(pathUtils.matchPath('/some/path', undefined)).toBe(false);
      expect(pathUtils.matchPath('/some/path', '')).toBe(false);
      expect(pathUtils.matchPath(undefined, '/pattern')).toBe(false);
      expect(pathUtils.matchPath('', '/pattern')).toBe(false);
    });
  });
  
  describe('createFullPath', () => {
    test('should join paths correctly', () => {
      const base = '/base/path';
      const relativePath = 'sub/folder';
      
      const result = pathUtils.createFullPath(base, relativePath);
      
      expect(result).toBe(path.join(base, relativePath));
    });
    
    test('should handle undefined relative path', () => {
      const base = '/base/path';
      
      const result = pathUtils.createFullPath(base, undefined);
      
      expect(result).toBe(base);
    });
    
    test('should handle empty relative path', () => {
      const base = '/base/path';
      
      const result = pathUtils.createFullPath(base, '');
      
      expect(result).toBe(base);
    });
  });
});