/**
 * UIAdapter - An adapter for user interface interactions
 * This abstraction makes it easier to test UI code by allowing mock implementations
 */
import inquirerModule from "inquirer";

export class UIAdapter {
  /**
   * Create a new UIAdapter
   * @param {Object} inquirerInstance Optional inquirer instance for testing
   */
  constructor(inquirerInstance = inquirerModule) {
    this.inquirer = inquirerInstance;
  }

  /**
   * Display a message to the console
   * @param {string} message The message to display
   */
  log(message) {
    console.log(message);
  }

  /**
   * Display an error message to the console
   * @param {string} message The error message to display
   */
  error(message) {
    console.error(message);
  }

  /**
   * Prompt the user for input using inquirer
   * @param {Array} questions Array of inquirer question objects
   * @returns {Promise<Object>} Promise resolving to user's answers
   */
  async prompt(questions) {
    return this.inquirer.prompt(questions);
  }
}

// Default instance to use throughout the application
export const uiAdapter = new UIAdapter();
