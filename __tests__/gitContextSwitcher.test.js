/**
 * Tests for the main GitContextSwitcher class
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { createGitContextSwitcher } from '../lib/gitContextSwitcher.js';
import { FileSystem } from '../lib/services/FileSystem.js';
import { GitService } from '../lib/services/GitService.js';
import { UserInterface } from '../lib/services/UserInterface.js';
import { Context } from '../lib/models/Context.js';
import { pathPatternToRegex } from '../lib/utils/pathUtils.js';

// Mock dependencies
jest.mock('../lib/services/FileSystem.js');
jest.mock('../lib/services/GitService.js');
jest.mock('../lib/services/UserInterface.js');
jest.mock('../lib/models/Context.js');
jest.mock('../lib/utils/pathUtils.js');

describe('GitContextSwitcher', () => {
  let switcher;
  let mockFileSystem;
  let mockGitService;
  let mockUI;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockFileSystem = new FileSystem();
    mockGitService = new GitService();
    mockUI = new UserInterface();
    
    // Setup path properties
    mockFileSystem.gitConfigPath = '/mock/home/.gitconfig';
    mockFileSystem.gitConfigDirPath = '/mock/home/.gitconfig.d';
    mockFileSystem.configFilePath = '/mock/home/.gitcontexts';
    
    // Create instance with mocked dependencies
    switcher = createGitContextSwitcher();
    
    // Replace the automatically created instances with our mocks
    switcher.fileSystem = mockFileSystem;
    switcher.gitService = mockGitService;
    switcher.ui = mockUI;
  });
  
  describe('runSetupWizard', () => {
    test('should run the setup wizard successfully', async () => {
      // Mock contexts
      const mockContexts = [
        { name: 'work', toConfigFileContent: jest.fn(() => 'work config content') },
        { name: 'personal', toConfigFileContent: jest.fn(() => 'personal config content') }
      ];
      
      // Setup mocks
      mockGitService.checkInstalled.mockResolvedValue(true);
      mockFileSystem.checkPermissions.mockResolvedValue(true);
      mockFileSystem.ensureConfigDirectoryExists.mockResolvedValue();
      mockFileSystem.backupGitConfig.mockResolvedValue('/mock/home/.gitconfig.backup.123');
      mockUI.getContextsFromUser.mockResolvedValue(mockContexts);
      mockFileSystem.saveContextConfig.mockResolvedValue();
      mockFileSystem.saveContexts.mockResolvedValue();
      mockFileSystem.readGitConfig.mockResolvedValue('[core]\n    editor = vim');
      mockGitService.removeConditionalIncludes.mockReturnValue('[core]\n    editor = vim');
      mockGitService.generateConditionalIncludes.mockReturnValue('[includeIf "gitdir:/work/**"]\n    path = /mock/home/.gitconfig.d/work.gitconfig');
      mockFileSystem.writeGitConfig.mockResolvedValue();
      
      await switcher.runSetupWizard();
      
      // Verify calls
      expect(mockUI.displayHeader).toHaveBeenCalledWith('Git Context Switcher - Setup Wizard');
      expect(mockGitService.checkInstalled).toHaveBeenCalled();
      expect(mockFileSystem.checkPermissions).toHaveBeenCalled();
      expect(mockFileSystem.ensureConfigDirectoryExists).toHaveBeenCalled();
      expect(mockFileSystem.backupGitConfig).toHaveBeenCalled();
      expect(mockUI.displaySuccess).toHaveBeenCalledWith(expect.stringContaining('Backed up existing git config'));
      expect(mockUI.getContextsFromUser).toHaveBeenCalled();
      
      // Verify each context config was saved
      expect(mockFileSystem.saveContextConfig).toHaveBeenCalledTimes(2);
      expect(mockFileSystem.saveContextConfig).toHaveBeenCalledWith('work', 'work config content');
      expect(mockFileSystem.saveContextConfig).toHaveBeenCalledWith('personal', 'personal config content');
      
      // Verify contexts were saved
      expect(mockFileSystem.saveContexts).toHaveBeenCalledWith(mockContexts);
      
      // Verify git config was updated
      expect(mockFileSystem.readGitConfig).toHaveBeenCalled();
      expect(mockGitService.removeConditionalIncludes).toHaveBeenCalled();
      expect(mockGitService.generateConditionalIncludes).toHaveBeenCalled();
      expect(mockFileSystem.writeGitConfig).toHaveBeenCalled();
      
      // Verify final success message
      expect(mockUI.displaySuccess).toHaveBeenCalledWith('Git Context Switcher setup complete!');
      expect(mockUI.displayContexts).toHaveBeenCalledWith(mockContexts, '/mock/home/.gitconfig.d');
    });
    
    test('should handle errors during setup', async () => {
      // Setup error condition
      mockGitService.checkInstalled.mockRejectedValue(new Error('Git not installed'));
      
      await switcher.runSetupWizard();
      
      expect(mockUI.displayError).toHaveBeenCalledWith('Git not installed');
    });
  });
  
  describe('addContext', () => {
    test('should add context successfully', async () => {
      // Mock context
      const newContext = { 
        name: 'new-context',
        validate: jest.fn(() => ({ isValid: true, errors: [] })),
        toConfigFileContent: jest.fn(() => 'new config content')
      };
      
      // Mock existing contexts
      const existingContexts = [
        { name: 'existing' }
      ];
      
      // Setup mocks
      mockFileSystem.checkPermissions.mockResolvedValue(true);
      mockFileSystem.ensureConfigDirectoryExists.mockResolvedValue();
      mockFileSystem.loadContexts.mockResolvedValue(existingContexts);
      mockUI.getContextFromUser.mockResolvedValue(newContext);
      mockFileSystem.saveContextConfig.mockResolvedValue('/mock/home/.gitconfig.d/new-context.gitconfig');
      mockFileSystem.saveContexts.mockResolvedValue();
      mockFileSystem.readGitConfig.mockResolvedValue('[core]\n    editor = vim');
      mockGitService.removeConditionalIncludes.mockReturnValue('[core]\n    editor = vim');
      mockGitService.generateConditionalIncludes.mockReturnValue('[includeIf "gitdir:/new-path/**"]\n    path = /mock/home/.gitconfig.d/new-context.gitconfig');
      mockFileSystem.writeGitConfig.mockResolvedValue();
      
      await switcher.addContext();
      
      // Verify calls
      expect(mockFileSystem.checkPermissions).toHaveBeenCalled();
      expect(mockFileSystem.ensureConfigDirectoryExists).toHaveBeenCalled();
      expect(mockFileSystem.loadContexts).toHaveBeenCalled();
      expect(mockUI.getContextFromUser).toHaveBeenCalled();
      expect(mockFileSystem.saveContextConfig).toHaveBeenCalledWith('new-context', 'new config content');
      
      // Verify contexts were updated
      expect(mockFileSystem.saveContexts).toHaveBeenCalledWith([
        { name: 'existing' },
        newContext
      ]);
      
      // Verify git config was updated
      expect(mockFileSystem.writeGitConfig).toHaveBeenCalled();
      
      // Verify success message
      expect(mockUI.displaySuccess).toHaveBeenCalledWith('Context "new-context" added successfully!');
    });
    
    test('should reject duplicate context names', async () => {
      // Mock existing contexts
      const existingContexts = [
        { name: 'existing' }
      ];
      
      // Setup mocks
      mockFileSystem.checkPermissions.mockResolvedValue(true);
      mockFileSystem.ensureConfigDirectoryExists.mockResolvedValue();
      mockFileSystem.loadContexts.mockResolvedValue(existingContexts);
      mockUI.getContextFromUser.mockResolvedValue({ name: 'existing' }); // Same as existing
      
      await switcher.addContext();
      
      // Should display error
      expect(mockUI.displayError).toHaveBeenCalledWith('Context "existing" already exists');
      
      // Should not save
      expect(mockFileSystem.saveContextConfig).not.toHaveBeenCalled();
      expect(mockFileSystem.saveContexts).not.toHaveBeenCalled();
    });
    
    test('should validate context before saving', async () => {
      // Mock context with validation error
      const invalidContext = { 
        name: 'invalid',
        validate: jest.fn(() => ({ isValid: false, errors: ['Invalid email'] }))
      };
      
      // Setup mocks
      mockFileSystem.checkPermissions.mockResolvedValue(true);
      mockFileSystem.ensureConfigDirectoryExists.mockResolvedValue();
      mockFileSystem.loadContexts.mockResolvedValue([]);
      mockUI.getContextFromUser.mockResolvedValue(invalidContext);
      
      await switcher.addContext();
      
      // Should display error
      expect(mockUI.displayError).toHaveBeenCalledWith('Invalid context: Invalid email');
      
      // Should not save
      expect(mockFileSystem.saveContextConfig).not.toHaveBeenCalled();
      expect(mockFileSystem.saveContexts).not.toHaveBeenCalled();
    });
  });
  
  describe('removeContext', () => {
    test('should remove context successfully', async () => {
      // Mock contexts
      const contexts = [
        { name: 'work' },
        { name: 'personal' }
      ];
      
      // Setup mocks
      mockFileSystem.loadContexts.mockResolvedValue(contexts);
      mockUI.selectContextToRemove.mockResolvedValue('work');
      mockFileSystem.checkPermissions.mockResolvedValue(true);
      mockFileSystem.deleteContextConfig.mockResolvedValue();
      mockFileSystem.saveContexts.mockResolvedValue();
      mockFileSystem.readGitConfig.mockResolvedValue('[core]\n    editor = vim');
      mockGitService.removeConditionalIncludes.mockReturnValue('[core]\n    editor = vim');
      mockGitService.generateConditionalIncludes.mockReturnValue('[includeIf "gitdir:/personal/**"]\n    path = /mock/home/.gitconfig.d/personal.gitconfig');
      mockFileSystem.writeGitConfig.mockResolvedValue();
      
      await switcher.removeContext();
      
      // Verify removal
      expect(mockFileSystem.deleteContextConfig).toHaveBeenCalledWith('work');
      expect(mockFileSystem.saveContexts).toHaveBeenCalledWith([{ name: 'personal' }]);
      expect(mockUI.displaySuccess).toHaveBeenCalledWith('Context "work" removed successfully!');
    });
    
    test('should handle no contexts case', async () => {
      mockFileSystem.loadContexts.mockResolvedValue([]);
      
      await switcher.removeContext();
      
      expect(mockUI.displayWarning).toHaveBeenCalledWith('No contexts configured yet. Nothing to remove.');
      expect(mockFileSystem.deleteContextConfig).not.toHaveBeenCalled();
    });
  });
  
  describe('applyContext', () => {
    test('should find matching context based on current directory', async () => {
      // Mock contexts
      const contexts = [
        { name: 'work', pathPattern: '/work/**' },
        { name: 'personal', pathPattern: '/personal/**' }
      ];
      
      // Mock Context.fromObject
      Context.fromObject.mockImplementation(obj => obj);
      
      // Mock path pattern matching
      pathPatternToRegex.mockImplementation(pattern => {
        if (pattern === '/work/**') {
          return { test: path => path.includes('/work') };
        }
        if (pattern === '/personal/**') {
          return { test: path => path.includes('/personal') };
        }
        return { test: () => false };
      });
      
      // Setup process.cwd mock
      const originalCwd = process.cwd;
      process.cwd = jest.fn(() => '/work/project');
      
      // Setup other mocks
      mockFileSystem.loadContexts.mockResolvedValue(contexts);
      mockGitService.getActiveConfig.mockResolvedValue('user.name=Work User');
      
      await switcher.applyContext();
      
      // Verify matched context
      expect(mockUI.displayActiveContext).toHaveBeenCalledWith(
        contexts[0],  // Work context should match
        '/mock/home/.gitconfig.d',
        'user.name=Work User'
      );
      
      // Restore original process.cwd
      process.cwd = originalCwd;
    });
    
    test('should handle no matching context', async () => {
      // Mock contexts
      const contexts = [
        { name: 'work', pathPattern: '/work/**' }
      ];
      
      // Mock Context.fromObject
      Context.fromObject.mockImplementation(obj => obj);
      
      // Mock path pattern matching (no match)
      pathPatternToRegex.mockImplementation(() => ({ test: () => false }));
      
      // Setup process.cwd mock
      const originalCwd = process.cwd;
      process.cwd = jest.fn(() => '/other/project');
      
      // Setup other mocks
      mockFileSystem.loadContexts.mockResolvedValue(contexts);
      mockGitService.getActiveConfig.mockResolvedValue('user.name=Default User');
      
      await switcher.applyContext();
      
      // Verify no match
      expect(mockUI.displayActiveContext).toHaveBeenCalledWith(
        null,  // No context should match
        '/mock/home/.gitconfig.d',
        'user.name=Default User'
      );
      
      // Restore original process.cwd
      process.cwd = originalCwd;
    });
    
    test('should handle no contexts configured', async () => {
      mockFileSystem.loadContexts.mockResolvedValue([]);
      
      await switcher.applyContext();
      
      expect(mockUI.displayWarning).toHaveBeenCalledWith('No contexts configured yet. Run setup to configure contexts.');
      expect(mockUI.displayActiveContext).not.toHaveBeenCalled();
    });
    
    test('should handle errors in git config', async () => {
      // Mock contexts
      const contexts = [
        { name: 'work', pathPattern: '/work/**' }
      ];
      
      // Mock Context.fromObject
      Context.fromObject.mockImplementation(obj => obj);
      
      // Mock path pattern matching
      pathPatternToRegex.mockImplementation(() => ({ test: () => true }));
      
      // Setup other mocks
      mockFileSystem.loadContexts.mockResolvedValue(contexts);
      mockGitService.getActiveConfig.mockRejectedValue(new Error('Not a git repository'));
      
      await switcher.applyContext();
      
      // Should still show context but with empty config
      expect(mockUI.displayActiveContext).toHaveBeenCalledWith(
        contexts[0],
        '/mock/home/.gitconfig.d',
        ''
      );
    });
  });
});