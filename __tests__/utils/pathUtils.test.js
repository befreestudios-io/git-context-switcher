/**
 * Tests for pathUtils functions
 */
import { jest, describe, test, expect, beforeEach, afterAll } from '@jest/globals';
import path from 'path';
import * as pathUtils from '../../lib/utils/pathUtils.js';
import { mockHomedir, setTestEnvironment, restoreEnvironment } from '../utils/testUtils/pathTestUtils.js';

// Set test environment
setTestEnvironment('test');

// Standard test home directory
const TEST_HOME_DIR = '/home/user';

describe('pathUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHomedir.mockReturnValue(TEST_HOME_DIR);
  });

  afterAll(() => {
    restoreEnvironment();
  });

  describe('expandPath', () => {
    test('should expand tilde to home directory', () => {
      const result = pathUtils.expandPath('~/projects', TEST_HOME_DIR);
      expect(result).toBe(`${TEST_HOME_DIR}/projects`);
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
      const result = pathUtils.expandPath('~', TEST_HOME_DIR);
      expect(result).toBe(TEST_HOME_DIR);
    });

    test('should handle undefined or empty paths', () => {
      expect(pathUtils.expandPath(undefined)).toBe(undefined);
      expect(pathUtils.expandPath('')).toBe('');
    });

    test('should handle paths with tilde in the middle', () => {
      const testPath = 'path/with/~/tilde';
      const result = pathUtils.expandPath(testPath);
      expect(result).toBe(testPath);
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
      const altHomeDir = '/home/developer';
      // We'll use the explicit test parameter instead of relying on mockHomedir
      
      const currentPath = '/home/developer/projects';
      const pattern = '~/projects';
      
      const result = pathUtils.matchPath(currentPath, pattern, altHomeDir);
      
      expect(result).toBe(true);
      // No need to check if mockHomedir was called since we're explicitly passing the home dir
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