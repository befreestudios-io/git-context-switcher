/**
 * Tests for UIAdapter
 */
import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { UIAdapter } from "../../lib/services/UIAdapter.js";

describe("UIAdapter", () => {
  let adapter;
  let mockInquirer;
  const originalLog = console.log;
  const originalError = console.error;

  // Create console spies
  const mockLog = jest.fn();
  const mockError = jest.fn();

  beforeEach(() => {
    // Replace console methods with mocks
    console.log = mockLog;
    console.error = mockError;

    // Create a mock inquirer with a prompt method
    mockInquirer = {
      prompt: jest.fn().mockResolvedValue({}),
    };

    // Create a new adapter instance with our mock inquirer
    adapter = new UIAdapter(mockInquirer);
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalLog;
    console.error = originalError;
  });

  test("log() should call console.log with the provided message", () => {
    const message = "Test message";
    adapter.log(message);
    expect(mockLog).toHaveBeenCalledWith(message);
  });

  test("error() should call console.error with the provided message", () => {
    const message = "Test error message";
    adapter.error(message);
    expect(mockError).toHaveBeenCalledWith(message);
  });

  test("prompt() should call inquirer.prompt with the provided questions", async () => {
    const questions = [
      { type: "input", name: "test", message: "Test question" },
    ];

    const expectedResponse = { test: "response" };
    mockInquirer.prompt.mockResolvedValueOnce(expectedResponse);

    const result = await adapter.prompt(questions);

    expect(mockInquirer.prompt).toHaveBeenCalledWith(questions);
    expect(result).toEqual(expectedResponse);
  });
});
