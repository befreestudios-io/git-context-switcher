/**
 * Tests for the UserInterface class
 */
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { UserInterface } from '../../lib/services/UserInterface.js';

// Create a properly mocked inquirer module
const mockPrompt = jest.fn();
jest.mock('inquirer', () => ({
  prompt: mockPrompt
}));


// Mock chalk to prevent color output in tests
jest.mock('chalk', () => ({
  blue: jest.fn(text => text),
  green: jest.fn(text => text),
  red: jest.fn(text => text),
  yellow: jest.fn(text => text),
  cyan: jest.fn(text => text),
  magenta: jest.fn(text => text),
  white: jest.fn(text => text),
  dim: jest.fn(text => text),
  bold: {
    white: {
      bgHex: jest.fn(() => jest.fn(text => text))
    }
  }
}));

// Mock console methods
const originalLog = console.log;
const originalError = console.error;
const mockConsole = {
  log: jest.fn(),
  error: jest.fn()
};

describe('UserInterface', () => {
  let ui;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockPrompt.mockClear();
    
    // Mock console methods
    console.log = mockConsole.log;
    console.error = mockConsole.error;
    
    // Create a new instance of UserInterface
    ui = new UserInterface();
  });
  
  afterEach(() => {
    // Restore console methods
    console.log = originalLog;
    console.error = originalError;
  });

  describe('displayHeader', () => {
    test('should display a formatted header', () => {
      ui.displayHeader('Test Header');
      
      expect(mockConsole.log).toHaveBeenCalledTimes(3);
      // Use nthCalledWith to check individual calls
      expect(mockConsole.log).toHaveBeenNthCalledWith(1, '========================================');
      expect(mockConsole.log).toHaveBeenNthCalledWith(2, 'Test Header');
      expect(mockConsole.log).toHaveBeenNthCalledWith(3, '========================================');
    });
  });
  
  describe('displaySuccess', () => {
    test('should display a success message', () => {
      ui.displaySuccess('Operation completed');
      
      expect(mockConsole.log).toHaveBeenCalled();
      expect(mockConsole.log.mock.calls[0][0]).toContain('Operation completed');
    });
  });
  
  describe('displayError', () => {
    test('should display an error message', () => {
      ui.displayError('Something went wrong');
      
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockConsole.error.mock.calls[0][0]).toContain('Error: Something went wrong');
    });
  });
  
  describe('getContextFromUser', () => {
    test('should return a context with user input', async () => {
      // Mock inquirer.prompt to return user answers
      mockPrompt.mockResolvedValueOnce({
        name: 'work',
        pathPattern: '~/work/**',
        userName: 'Work User',
        userEmail: 'work@example.com',
        addSigningKey: false
      });
      
      const context = await ui.getContextFromUser();
      
      expect(context).toBeDefined();
      expect(context.name).toBe('work');
      expect(context.pathPattern).toBe('~/work/**');
      expect(context.userName).toBe('Work User');
      expect(context.userEmail).toBe('work@example.com');
      expect(context.signingKey).toBeNull();
      expect(context.autoSign).toBe(false);
    });
    
    test('should handle GPG signing key input', async () => {
      // First prompt for context info
      mockPrompt.mockResolvedValueOnce({
        name: 'personal',
        pathPattern: '~/personal/**',
        userName: 'Personal User',
        userEmail: 'personal@example.com',
        addSigningKey: true
      });
      
      // Then prompt for signing key info
      mockPrompt.mockResolvedValueOnce({
        signingKey: 'ABC123',
        autoSign: true
      });
      
      const context = await ui.getContextFromUser();
      
      expect(context).toBeDefined();
      expect(context.name).toBe('personal');
      expect(context.signingKey).toBe('ABC123');
      expect(context.autoSign).toBe(true);
      expect(mockPrompt).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('getContextsFromUser', () => {
    test('should collect multiple contexts', async () => {
      // Setup for first context
      mockPrompt
        // First prompt for context info
        .mockResolvedValueOnce({
          name: 'work',
          pathPattern: '~/work/**',
          userName: 'Work User',
          userEmail: 'work@example.com',
          addSigningKey: false
        })
        // Then ask if user wants to add another context
        .mockResolvedValueOnce({ addAnother: true })
        // Second context info
        .mockResolvedValueOnce({
          name: 'personal',
          pathPattern: '~/personal/**',
          userName: 'Personal User',
          userEmail: 'personal@example.com',
          addSigningKey: false
        })
        // Then ask if user wants to add another context
        .mockResolvedValueOnce({ addAnother: false });
      
      const contexts = await ui.getContextsFromUser();
      
      expect(contexts).toHaveLength(2);
      expect(contexts[0].name).toBe('work');
      expect(contexts[1].name).toBe('personal');
      expect(mockPrompt).toHaveBeenCalledTimes(4);
    });
  });
  
  describe('selectContextToRemove', () => {
    test('should let user select a context to remove', async () => {
      const contexts = [
        { name: 'work', pathPattern: '~/work/**' },
        { name: 'personal', pathPattern: '~/personal/**' }
      ];
      
      mockPrompt.mockResolvedValueOnce({ contextName: 'work' });
      
      const selectedContext = await ui.selectContextToRemove(contexts);
      
      expect(selectedContext).toBe('work');
      expect(mockPrompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'list',
          name: 'contextName',
          choices: ['work', 'personal']
        })
      ]);
    });
    
    test('should return null if no contexts are available', async () => {
      const selectedContext = await ui.selectContextToRemove([]);
      
      expect(selectedContext).toBeNull();
      expect(mockPrompt).not.toHaveBeenCalled();
    });
  });
  
  describe('displayContexts', () => {
    test('should display multiple contexts', () => {
      const contexts = [
        { name: 'work', userName: 'Work User', userEmail: 'work@example.com', pathPattern: '~/work/**' },
        { name: 'personal', userName: 'Personal User', userEmail: 'personal@example.com', pathPattern: '~/personal/**', signingKey: 'ABC123', autoSign: true }
      ];
      
      ui.displayContexts(contexts, '~/.gitconfig.d');
      
      expect(mockConsole.log).toHaveBeenCalled();
      // First context should be displayed
      expect(mockConsole.log.mock.calls.some(call => 
        call[0] && call[0].includes('WORK'))).toBe(true);
      // Second context should be displayed
      expect(mockConsole.log.mock.calls.some(call => 
        call[0] && call[0].includes('PERSONAL'))).toBe(true);
      // Should mention signing key for personal context
      expect(mockConsole.log.mock.calls.some(call => 
        call[0] && call[0].includes('Signing Key'))).toBe(true);
    });
    
    test('should do nothing when no contexts are provided', () => {
      ui.displayContexts([], '~/.gitconfig.d');
      expect(mockConsole.log).not.toHaveBeenCalled();
      
      ui.displayContexts(null, '~/.gitconfig.d');
      expect(mockConsole.log).not.toHaveBeenCalled();
    });
  });
});