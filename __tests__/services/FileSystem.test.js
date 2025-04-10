/**
 * Tests for the FileSystem service
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { FileSystem } from '../../lib/services/FileSystem.js';
import { mockSanitizeInput } from '../setup.js';
import path from 'path';

// Mock the fs-extra module
const mockFs = {
  access: jest.fn(),
  pathExists: jest.fn(),
  ensureDir: jest.fn(),
  copy: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  remove: jest.fn() // Add the missing remove function
};

jest.mock('fs-extra', () => mockFs);

describe('FileSystem', () => {
  let fileSystem;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    Object.values(mockFs).forEach(mock => mock.mockReset());
    mockSanitizeInput.mockClear();
    
    // Create a new instance of FileSystem
    fileSystem = new FileSystem();
  });

  describe('checkPermissions', () => {
    test('should return true when all paths are accessible', async () => {
      // Mock fs.access to resolve successfully
      mockFs.access.mockResolvedValueOnce()
                   .mockResolvedValueOnce()
                   .mockResolvedValueOnce();
      
      const result = await fileSystem.checkPermissions();
      
      expect(result).toBe(true);
      expect(mockFs.access).toHaveBeenCalledTimes(fileSystem.requiredPaths.length);
    });
    
    test('should handle missing files gracefully', async () => {
      // Mock fs.access to reject for missing files
      mockFs.access.mockRejectedValueOnce(new Error('ENOENT'))
                   .mockResolvedValueOnce()
                   .mockResolvedValueOnce();
      
      const result = await fileSystem.checkPermissions();
      
      expect(result).toBe(true);
    });
    
    test('should return false when permission error occurs', async () => {
      // Mock fs.access to reject with permission error
      mockFs.access.mockResolvedValueOnce()
                   .mockRejectedValueOnce(new Error('EACCES'))
                   .mockResolvedValueOnce();
      
      const result = await fileSystem.checkPermissions();
      
      expect(result).toBe(false);
    });
  });

  describe('ensureConfigDirectoryExists', () => {
    test('should create directory if it does not exist', async () => {
      // Mock fs.pathExists to return false (directory doesn't exist)
      mockFs.pathExists.mockResolvedValueOnce(false);
      mockFs.ensureDir.mockResolvedValueOnce();
      
      await fileSystem.ensureConfigDirectoryExists();
      
      expect(mockFs.pathExists).toHaveBeenCalledTimes(1);
      expect(mockFs.ensureDir).toHaveBeenCalledTimes(1);
    });
    
    test('should not create directory if it already exists', async () => {
      // Mock fs.pathExists to return true (directory exists)
      mockFs.pathExists.mockResolvedValueOnce(true);
      
      await fileSystem.ensureConfigDirectoryExists();
      
      expect(mockFs.pathExists).toHaveBeenCalledTimes(1);
      expect(mockFs.ensureDir).not.toHaveBeenCalled();
    });
    
    test('should handle errors when creating directory', async () => {
      // Mock fs.pathExists to return false and fs.ensureDir to reject
      mockFs.pathExists.mockResolvedValueOnce(false);
      mockFs.ensureDir.mockRejectedValueOnce(new Error('Failed to create directory'));
      
      await expect(fileSystem.ensureConfigDirectoryExists()).rejects.toThrow('Failed to create directory');
    });
  });

  describe('backupGitConfig', () => {
    test('should create backup of git config', async () => {
      // Mock Date.now for consistent timestamps in tests
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 1234567890);
      
      mockFs.pathExists.mockResolvedValueOnce(true);
      mockFs.copy.mockResolvedValueOnce();
      
      const backupPath = await fileSystem.backupGitConfig();
      
      expect(mockFs.pathExists).toHaveBeenCalledWith(fileSystem.gitConfigPath);
      expect(mockFs.copy).toHaveBeenCalledWith(
        fileSystem.gitConfigPath,
        expect.stringContaining('.gitconfig.backup.')
      );
      expect(backupPath).toContain('.gitconfig.backup.1234567890');
      
      // Restore Date.now
      Date.now = originalDateNow;
    });
    
    test('should throw error when git config does not exist', async () => {
      mockFs.pathExists.mockResolvedValueOnce(false);
      
      await expect(fileSystem.backupGitConfig()).rejects.toThrow('Git config file does not exist');
      expect(mockFs.copy).not.toHaveBeenCalled();
    });
    
    test('should propagate errors from fs operations', async () => {
      mockFs.pathExists.mockResolvedValueOnce(true);
      mockFs.copy.mockRejectedValueOnce(new Error('Copy failed'));
      
      await expect(fileSystem.backupGitConfig()).rejects.toThrow('Copy failed');
    });
  });

  describe('readGitConfig', () => {
    test('should read the git config file', async () => {
      const configContent = '[user]\n    name = Test User\n    email = test@example.com';
      mockFs.readFile.mockResolvedValueOnce(configContent);
      
      const result = await fileSystem.readGitConfig();
      
      expect(result).toBe(configContent);
      expect(mockFs.readFile).toHaveBeenCalledWith(fileSystem.gitConfigPath, 'utf8');
    });
    
    test('should propagate errors from fs operations', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('Read failed'));
      
      await expect(fileSystem.readGitConfig()).rejects.toThrow('Read failed');
    });
  });

  describe('writeGitConfig', () => {
    test('should write content to git config file', async () => {
      const configContent = '[user]\n    name = Test User\n    email = test@example.com';
      mockFs.writeFile.mockResolvedValueOnce();
      
      await fileSystem.writeGitConfig(configContent);
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(fileSystem.gitConfigPath, configContent, 'utf8');
    });
    
    test('should propagate errors from fs operations', async () => {
      mockFs.writeFile.mockRejectedValueOnce(new Error('Write failed'));
      
      await expect(fileSystem.writeGitConfig('content')).rejects.toThrow('Write failed');
    });
  });

  // Update test cases to use mockSanitizeInput instead of sanitizeInput
  describe('saveContextConfig', () => {
    test('should save context config to file', async () => {
      const contextName = 'work';
      const content = '[user]\n    name = Work User\n    email = work@example.com';
      mockFs.writeFile.mockResolvedValueOnce();
      
      // Mock sanitizeInput to return the same value
      mockSanitizeInput.mockImplementation(input => input);
      
      await fileSystem.saveContextConfig(contextName, content);
      
      expect(mockSanitizeInput).toHaveBeenCalledWith(contextName);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(path.join('contexts', 'work.gitconfig')),
        content,
        { mode: 0o600 } // Update expected parameters to match implementation
      );
    });
    
    test('should sanitize context name before using in path', async () => {
      const contextName = 'work;rm -rf /';
      const content = '[user]\n    name = Work User\n    email = work@example.com';
      mockFs.writeFile.mockResolvedValueOnce();
      
      // Mock sanitizeInput to remove dangerous characters
      mockSanitizeInput.mockImplementation(input => input.replace(/[;&|`$(){}[\]\\"'*?~<>]/g, ''));
      
      await fileSystem.saveContextConfig(contextName, content);
      
      expect(mockSanitizeInput).toHaveBeenCalledWith(contextName);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(path.join('contexts', 'workrm-rf.gitconfig')),
        content,
        { mode: 0o600 } // Update expected parameters to match implementation
      );
    });
    
    test('should propagate errors from fs operations', async () => {
      mockSanitizeInput.mockImplementation(input => input);
      mockFs.writeFile.mockRejectedValueOnce(new Error('Write failed'));
      
      await expect(fileSystem.saveContextConfig('work', 'content')).rejects.toThrow('Write failed');
    });
  });

  describe('deleteContextConfig', () => {
    test('should delete context config file', async () => {
      const contextName = 'work';
      mockFs.unlink.mockResolvedValueOnce();
      mockFs.pathExists.mockResolvedValueOnce(true);
      
      // Mock sanitizeInput to return the same value
      mockSanitizeInput.mockImplementation(input => input);
      
      await fileSystem.deleteContextConfig(contextName);
      
      expect(mockSanitizeInput).toHaveBeenCalledWith(contextName);
      expect(mockFs.remove).toHaveBeenCalledWith(
        expect.stringContaining(path.join('contexts', 'work.gitconfig'))
      );
    });
    
    test('should sanitize context name before using in path', async () => {
      const contextName = 'work;rm -rf /';
      mockFs.pathExists.mockResolvedValueOnce(true);
      mockFs.remove.mockResolvedValueOnce();
      
      // Mock sanitizeInput to remove dangerous characters
      mockSanitizeInput.mockImplementation(input => input.replace(/[;&|`$(){}[\]\\"'*?~<>]/g, ''));
      
      await fileSystem.deleteContextConfig(contextName);
      
      expect(mockSanitizeInput).toHaveBeenCalledWith(contextName);
      expect(mockFs.remove).toHaveBeenCalledWith(
        expect.stringContaining(path.join('contexts', 'workrm-rf.gitconfig'))
      );
    });
    
    test('should handle file not found gracefully', async () => {
      mockSanitizeInput.mockImplementation(input => input);
      mockFs.pathExists.mockResolvedValueOnce(false);
      
      // Should not throw error
      await fileSystem.deleteContextConfig('work');
      
      expect(mockFs.remove).not.toHaveBeenCalled();
    });
    
    test('should propagate other errors from fs operations', async () => {
      mockSanitizeInput.mockImplementation(input => input);
      mockFs.pathExists.mockResolvedValueOnce(true);
      mockFs.remove.mockRejectedValueOnce(new Error('Delete failed'));
      
      await expect(fileSystem.deleteContextConfig('work')).rejects.toThrow('Delete failed');
    });
  });
});