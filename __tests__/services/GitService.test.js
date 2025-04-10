/**
 * Tests for the GitService class
 */
import { jest, describe, test, expect, beforeEach, afterAll } from '@jest/globals';
import { GitService } from '../../lib/services/GitService.js';
import { mockSanitizeInput } from '../setup.js';
import { 
  mockExec, 
  mockFailedExec,
  mockGitInstalled,
  mockGitConfig,
  resetExecMocks
} from '../utils/testUtils/execTestUtils.js';
import { setTestEnvironment, restoreEnvironment } from '../utils/testUtils/pathTestUtils.js';

// Set test environment
setTestEnvironment('test');

describe('GitService', () => {
  let gitService;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    mockSanitizeInput.mockClear();
    resetExecMocks();
    
    // Create a new instance of GitService with the mock exec function
    gitService = new GitService(mockExec);
  });

  afterAll(() => {
    restoreEnvironment();
  });

  describe('checkInstalled', () => {
    test('should return true when git is installed', async () => {
      // Mock exec to succeed when checking for git
      mockGitInstalled(true);

      const result = await gitService.checkInstalled();
      
      expect(result).toBe(true);
      expect(mockExec).toHaveBeenCalledWith('git --version');
    });

    test('should throw error when git is not installed', async () => {
      // Mock exec to fail when checking for git
      mockFailedExec('Command not found: git');
      
      await expect(gitService.checkInstalled()).rejects.toThrow('Git is not installed');
      expect(mockExec).toHaveBeenCalledWith('git --version');
    });
  });

  describe('getActiveConfig', () => {
    test('should execute git command to get config', async () => {
      // Mock exec to return config
      const testConfig = 'user.name=Test\nuser.email=test@example.com';
      mockGitConfig(testConfig);
      
      const result = await gitService.getActiveConfig();
      
      expect(result).toBe(testConfig);
      expect(mockExec).toHaveBeenCalledWith('git config --list');
    });

    test('should throw error when git command fails', async () => {
      // Mock exec to fail
      mockFailedExec('Failed to get config');
      
      await expect(gitService.getActiveConfig()).rejects.toThrow('Failed to get git configuration');
      expect(mockExec).toHaveBeenCalledWith('git config --list');
    });
  });

  describe('removeConditionalIncludes', () => {
    test('should remove conditional include sections from config', () => {
      const configContent = `[user]
    name = Test User
    email = test@example.com
[includeIf "gitdir:/path/to/work/"]
    path = /path/to/work.gitconfig
[core]
    editor = vim`;
      
      const result = gitService.removeConditionalIncludes(configContent);
      
      expect(result).not.toContain('includeIf');
      expect(result).toContain('[user]');
      expect(result).toContain('[core]');
      expect(result).not.toContain('path = /path/to/work.gitconfig');
    });
    
    test('should handle empty input', () => {
      const result = gitService.removeConditionalIncludes('');
      
      expect(result).toBe('');
    });
  });

  describe('generateConditionalIncludes', () => {
    test('should generate include sections for contexts', () => {
      const contexts = [
        { name: 'work', pathPattern: '/path/to/work/**' },
        { name: 'personal', pathPattern: '/path/to/personal/**' }
      ];
      const basePath = '/path/to/configs';
      
      const result = gitService.generateConditionalIncludes(contexts, basePath);
      
      expect(result).toContain('[includeIf "gitdir:/path/to/work/**"]');
      expect(result).toContain('[includeIf "gitdir:/path/to/personal/**"]');
      expect(result).toContain('path = /path/to/configs/work.gitconfig');
      expect(result).toContain('path = /path/to/configs/personal.gitconfig');
    });
    
    test('should handle empty contexts array', () => {
      const result = gitService.generateConditionalIncludes([], '/path/to/configs');
      
      expect(result).toBe('');
    });
    
    test('should filter out invalid contexts', () => {
      const contexts = [
        { name: 'valid', pathPattern: '/valid/path/**' },
        { name: '', pathPattern: '/invalid/path/**' }, // Invalid name
        { name: 'invalid', pathPattern: '' }, // Invalid pattern
        { notAName: 'invalid', pathPattern: '/invalid/path/**' } // Missing name
      ];
      const basePath = '/path/to/configs';
      
      const result = gitService.generateConditionalIncludes(contexts, basePath);
      
      expect(result).toContain('[includeIf "gitdir:/valid/path/**"]');
      expect(result).not.toContain('/invalid/path/');
    });
  });
});