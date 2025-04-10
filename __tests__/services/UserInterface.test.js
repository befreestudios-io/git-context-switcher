/**
 * Tests for the UserInterface class
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { UserInterface } from '../../lib/services/UserInterface.js';

// Mock readline module
const mockReadline = {
  createInterface: jest.fn(),
  Interface: {
    prototype: {
      question: jest.fn(),
      close: jest.fn()
    }
  }
};

jest.mock('readline', () => mockReadline);

describe('UserInterface', () => {
  let ui;
  let mockInterface;
  
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();

    // Create mock readline interface
    mockInterface = {
      question: jest.fn(),
      close: jest.fn()
    };
    
    // Setup createInterface mock to return our mockInterface
    mockReadline.createInterface.mockReturnValue(mockInterface);
    
    // Create a new instance of UserInterface
    ui = new UserInterface();
  });

  describe('promptUser', () => {
    test('should prompt user and return answer', async () => {
      const question = 'What is your name?';
      const expectedAnswer = 'John Doe';
      
      // Setup mock to call callback with the expected answer
      mockInterface.question.mockImplementation((q, callback) => {
        expect(q).toBe(question);
        callback(expectedAnswer);
      });
      
      const answer = await ui.promptUser(question);
      
      expect(answer).toBe(expectedAnswer);
      expect(mockInterface.question).toHaveBeenCalledWith(question, expect.any(Function));
      expect(mockInterface.close).toHaveBeenCalled();
    });
    
    test('should handle empty answers', async () => {
      const question = 'What is your email?';
      
      // Setup mock to call callback with empty string
      mockInterface.question.mockImplementation((q, callback) => {
        callback('');
      });
      
      const answer = await ui.promptUser(question);
      
      expect(answer).toBe('');
      expect(mockInterface.close).toHaveBeenCalled();
    });
    
    test('should reject if error occurs', async () => {
      const question = 'What is your age?';
      const error = new Error('Input error');
      
      // Setup mock to throw error
      mockInterface.question.mockImplementation(() => {
        throw error;
      });
      
      await expect(ui.promptUser(question)).rejects.toThrow('Input error');
    });
  });

  describe('promptForConfirmation', () => {
    test('should return true for "y" answer', async () => {
      mockInterface.question.mockImplementation((q, callback) => {
        callback('y');
      });
      
      const confirmed = await ui.promptForConfirmation('Continue?');
      
      expect(confirmed).toBe(true);
    });
    
    test('should return true for "Y" answer', async () => {
      mockInterface.question.mockImplementation((q, callback) => {
        callback('Y');
      });
      
      const confirmed = await ui.promptForConfirmation('Continue?');
      
      expect(confirmed).toBe(true);
    });
    
    test('should return true for "yes" answer', async () => {
      mockInterface.question.mockImplementation((q, callback) => {
        callback('yes');
      });
      
      const confirmed = await ui.promptForConfirmation('Continue?');
      
      expect(confirmed).toBe(true);
    });
    
    test('should return false for "n" answer', async () => {
      mockInterface.question.mockImplementation((q, callback) => {
        callback('n');
      });
      
      const confirmed = await ui.promptForConfirmation('Continue?');
      
      expect(confirmed).toBe(false);
    });
    
    test('should return false for empty answer', async () => {
      mockInterface.question.mockImplementation((q, callback) => {
        callback('');
      });
      
      const confirmed = await ui.promptForConfirmation('Continue?');
      
      expect(confirmed).toBe(false);
    });
    
    test('should return false for any other answer', async () => {
      mockInterface.question.mockImplementation((q, callback) => {
        callback('maybe');
      });
      
      const confirmed = await ui.promptForConfirmation('Continue?');
      
      expect(confirmed).toBe(false);
    });
  });

  describe('showMenu', () => {
    test('should display menu and return valid selection', async () => {
      const options = ['Option 1', 'Option 2', 'Option 3'];
      
      // First prompt for menu selection, then prompt for confirmation
      mockInterface.question.mockImplementationOnce((q, callback) => {
        // Verify menu options are in the prompt
        expect(q).toContain('Option 1');
        expect(q).toContain('Option 2');
        expect(q).toContain('Option 3');
        callback('2');
      });
      
      const selection = await ui.showMenu('Select an option:', options);
      
      expect(selection).toBe(1); // 0-based index (user entered 2)
      expect(mockInterface.question).toHaveBeenCalledTimes(1);
      expect(mockInterface.close).toHaveBeenCalled();
    });
    
    test('should handle invalid input and reprompt', async () => {
      const options = ['Option 1', 'Option 2'];
      
      // Mock question three times: invalid input, out of range, then valid
      mockInterface.question.mockImplementationOnce((q, callback) => {
        callback('abc'); // Invalid input (not a number)
      }).mockImplementationOnce((q, callback) => {
        callback('3'); // Out of range
      }).mockImplementationOnce((q, callback) => {
        callback('2'); // Valid input
      });
      
      const selection = await ui.showMenu('Select:', options);
      
      expect(selection).toBe(1); // 0-based index
      expect(mockInterface.question).toHaveBeenCalledTimes(3);
      expect(mockInterface.close).toHaveBeenCalled();
    });
    
    test('should handle empty options array', async () => {
      const options = [];
      
      await expect(ui.showMenu('No options:', options)).rejects.toThrow('No options provided');
      expect(mockInterface.question).not.toHaveBeenCalled();
    });
  });
});