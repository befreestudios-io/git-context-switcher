/**
 * Jest setup file for ES modules support
 */

// Import Jest globals
import { jest } from '@jest/globals';

// Make jest available globally - helps with ES module mocking
global.jest = jest;

// This will make sure that all modules required during tests use the mocked version when available
jest.mock('../lib/services/FileSystem.js');
jest.mock('../lib/services/GitService.js');
jest.mock('../lib/services/UserInterface.js');
jest.mock('../lib/models/Context.js');
jest.mock('../lib/utils/pathUtils.js');
jest.mock('../lib/utils/security.js');

// Mock external modules
jest.mock('fs-extra');
jest.mock('child_process');

// Set additional Jest configurations if needed
jest.setTimeout(10000); // Set timeout for tests