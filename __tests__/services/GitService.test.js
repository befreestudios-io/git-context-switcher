/**
 * Tests for the GitService class
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { GitService } from '../../lib/services/GitService.js';
import { sanitizeInput } from '../../lib/utils/security.js';

// Create mock for child_process
const mockExec = jest.fn();
const mockExecSync = jest.fn();

// Mock child_process
jest.mock('child_process', () => ({
  exec: (...args) => mockExec(...args),
  execSync: (...args) => mockExecSync(...args)
}));

// Mock security util
jest.mock('../../lib/utils/security.js', () => ({
  sanitizeInput: jest.fn(input => input)
}));

describe('GitService', () => {
  let gitService;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    mockExec.mockReset();
    mockExecSync.mockReset();
    sanitizeInput.mockClear();
    
    // Create a new instance of GitService
    gitService = new GitService();
  });

  describe('checkGitInstalled', () => {
    test('should return true when git is installed', async () => {
      // Mock exec to succeed when checking for git
      mockExec.mockImplementation((command, callback) => {
        callback(null, '/usr/bin/git', '');
      });

      const result = await gitService.checkGitInstalled();
      
      expect(result).toBe(true);
      expect(mockExec).toHaveBeenCalledWith('which git || where git', expect.any(Function));
    });

    test('should return false when git is not installed', async () => {
      // Mock exec to fail when checking for git
      mockExec.mockImplementation((command, callback) => {
        callback(new Error('Command not found'), '', 'git not found');
      });
      
      const result = await gitService.checkGitInstalled();
      
      expect(result).toBe(false);
      expect(mockExec).toHaveBeenCalledWith('which git || where git', expect.any(Function));
    });
  });

  describe('getGitConfigPath', () => {
    test('should execute git command to get config path', async () => {
      // Mock exec to return the config path
      mockExec.mockImplementation((command, callback) => {
        callback(null, '/home/user/.gitconfig', '');
      });
      
      const result = await gitService.getGitConfigPath();
      
      expect(result).toBe('/home/user/.gitconfig');
      expect(mockExec).toHaveBeenCalledWith('git config --list --show-origin', expect.any(Function));
    });

    test('should handle errors and return empty string', async () => {
      // Mock exec to fail
      mockExec.mockImplementation((command, callback) => {
        callback(new Error('Failed to get config'), '', 'error');
      });
      
      const result = await gitService.getGitConfigPath();
      
      expect(result).toBe('');
    });
    
    test('should extract path from git output', async () => {
      // Mock exec with realistic git output
      mockExec.mockImplementation((command, callback) => {
        callback(null, 'file:/home/user/.gitconfig\tuser.name=Test\nfile:/home/user/.gitconfig\tuser.email=test@example.com', '');
      });
      
      const result = await gitService.getGitConfigPath();
      
      expect(result).toBe('/home/user/.gitconfig');
    });
  });

  describe('getGitVersion', () => {
    test('should extract git version from git output', async () => {
      // Mock exec with realistic git version output
      mockExec.mockImplementation((command, callback) => {
        callback(null, 'git version 2.30.1', '');
      });
      
      const result = await gitService.getGitVersion();
      
      expect(result).toBe('2.30.1');
      expect(mockExec).toHaveBeenCalledWith('git --version', expect.any(Function));
    });
    
    test('should handle errors and return empty string', async () => {
      // Mock exec to fail
      mockExec.mockImplementation((command, callback) => {
        callback(new Error('Failed to get version'), '', 'error');
      });
      
      const result = await gitService.getGitVersion();
      
      expect(result).toBe('');
    });
    
    test('should handle unexpected format in git output', async () => {
      // Mock exec with unexpected output
      mockExec.mockImplementation((command, callback) => {
        callback(null, 'unexpected output format', '');
      });
      
      const result = await gitService.getGitVersion();
      
      expect(result).toBe('');
    });
  });

  describe('setGitConfig', () => {
    test('should set git config value', async () => {
      await gitService.setGitConfig('user.name', 'Test User');
      
      expect(mockExec).toHaveBeenCalledWith('git config --global user.name "Test User"', expect.any(Function));
    });
    
    test('should sanitize input before setting config', async () => {
      sanitizeInput.mockImplementation(input => {
        if (input === 'key;with;semicolons') return 'keywithsemicolons';
        if (input === 'value;with;semicolons') return 'valuewithsemicolons';
        return input;
      });
      
      await gitService.setGitConfig('key;with;semicolons', 'value;with;semicolons');
      
      expect(sanitizeInput).toHaveBeenCalledWith('key;with;semicolons');
      expect(sanitizeInput).toHaveBeenCalledWith('value;with;semicolons');
      expect(mockExec).toHaveBeenCalledWith('git config --global keywithsemicolons "valuewithsemicolons"', expect.any(Function));
    });
    
    test('should handle errors when setting config', async () => {
      // Mock exec to fail
      mockExec.mockImplementation((command, callback) => {
        callback(new Error('Failed to set config'), '', 'error');
      });
      
      await expect(gitService.setGitConfig('user.name', 'Test User')).rejects.toThrow('Failed to set config');
    });
  });

  describe('getGitConfig', () => {
    test('should get git config value', async () => {
      // Mock exec to return config value
      mockExec.mockImplementation((command, callback) => {
        callback(null, 'Test User', '');
      });
      
      const result = await gitService.getGitConfig('user.name');
      
      expect(result).toBe('Test User');
      expect(mockExec).toHaveBeenCalledWith('git config --global user.name', expect.any(Function));
    });
    
    test('should sanitize input before getting config', async () => {
      // Mock exec to return config value
      mockExec.mockImplementation((command, callback) => {
        callback(null, 'Test Value', '');
      });
      
      sanitizeInput.mockImplementation(input => {
        if (input === 'key;with;semicolons') return 'keywithsemicolons';
        return input;
      });
      
      await gitService.getGitConfig('key;with;semicolons');
      
      expect(sanitizeInput).toHaveBeenCalledWith('key;with;semicolons');
      expect(mockExec).toHaveBeenCalledWith('git config --global keywithsemicolons', expect.any(Function));
    });
    
    test('should handle errors when getting config', async () => {
      // Mock exec to fail
      mockExec.mockImplementation((command, callback) => {
        callback(new Error('Failed to get config'), '', 'error');
      });
      
      const result = await gitService.getGitConfig('user.name');
      
      expect(result).toBe('');
    });
  });

  describe('unsetGitConfig', () => {
    test('should unset git config value', async () => {
      await gitService.unsetGitConfig('user.name');
      
      expect(mockExec).toHaveBeenCalledWith('git config --global --unset user.name', expect.any(Function));
    });
    
    test('should sanitize input before unsetting config', async () => {
      sanitizeInput.mockImplementation(input => {
        if (input === 'key;with;semicolons') return 'keywithsemicolons';
        return input;
      });
      
      await gitService.unsetGitConfig('key;with;semicolons');
      
      expect(sanitizeInput).toHaveBeenCalledWith('key;with;semicolons');
      expect(mockExec).toHaveBeenCalledWith('git config --global --unset keywithsemicolons', expect.any(Function));
    });
    
    test('should handle errors when unsetting config', async () => {
      // Mock exec to fail
      mockExec.mockImplementation((command, callback) => {
        callback(new Error('Failed to unset config'), '', 'error');
      });
      
      await expect(gitService.unsetGitConfig('user.name')).rejects.toThrow('Failed to unset config');
    });
  });

  describe('includeGitConfig', () => {
    test('should add include directive to git config', async () => {
      await gitService.includeGitConfig('/path/to/config');
      
      expect(mockExec).toHaveBeenCalledWith('git config --global --add include.path "/path/to/config"', expect.any(Function));
    });
    
    test('should sanitize input path', async () => {
      sanitizeInput.mockImplementation(input => {
        if (input === '/path/with;semicolons') return '/pathwithsemicolons';
        return input;
      });
      
      await gitService.includeGitConfig('/path/with;semicolons');
      
      expect(sanitizeInput).toHaveBeenCalledWith('/path/with;semicolons');
      expect(mockExec).toHaveBeenCalledWith('git config --global --add include.path "/pathwithsemicolons"', expect.any(Function));
    });
    
    test('should handle errors when adding include directive', async () => {
      // Mock exec to fail
      mockExec.mockImplementation((command, callback) => {
        callback(new Error('Failed to include config'), '', 'error');
      });
      
      await expect(gitService.includeGitConfig('/path/to/config')).rejects.toThrow('Failed to include config');
    });
  });

  describe('removeIncludeGitConfig', () => {
    test('should remove include directive from git config', async () => {
      mockExecSync.mockImplementation(() => Buffer.from('/path/to/config\n'));
      await gitService.removeIncludeGitConfig('/path/to/config');
      
      expect(mockExecSync).toHaveBeenCalledWith('git config --global --get-all include.path');
      expect(mockExec).toHaveBeenCalledWith('git config --global --unset include.path "/path/to/config"', expect.any(Function));
    });
    
    test('should sanitize input path', async () => {
      sanitizeInput.mockImplementation(input => {
        if (input === '/path/with;semicolons') return '/pathwithsemicolons';
        return input;
      });
      
      await gitService.removeIncludeGitConfig('/path/with;semicolons');
      
      expect(sanitizeInput).toHaveBeenCalledWith('/path/with;semicolons');
      expect(mockExec).toHaveBeenCalledWith('git config --global --unset include.path "/pathwithsemicolons"', expect.any(Function));
    });
    
    test('should handle errors when removing include directive', async () => {
      // Mock exec to fail
      mockExec.mockImplementation((command, callback) => {
        callback(new Error('Failed to remove include'), '', 'error');
      });
      
      await expect(gitService.removeIncludeGitConfig('/path/to/config')).rejects.toThrow('Failed to remove include');
    });
  });
});