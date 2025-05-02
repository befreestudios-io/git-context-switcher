/**
 * Path utilities for Git Context Switcher
 */
import path from 'path';
import os from 'os';
import tmp from 'tmp';

/**
 * Normalize path pattern for git config
 * @param {string} pattern Path pattern to normalize
 * @param {string} homeDir Home directory path
 * @returns {string} Normalized path pattern
 */
export function normalizePathPattern(pattern, homeDir = os.homedir()) {
  if (typeof pattern !== 'string') {
    return '';
  }
  
  // Replace ~ with actual home directory
  pattern = pattern.replace(/^~/, homeDir);
  
  // Ensure pattern ends with /** if it doesn't have a trailing pattern
  if (!pattern.endsWith('/*') && !pattern.endsWith('/**')) {
    pattern = path.join(pattern, '**');
  }
  
  return pattern;
}

/**
 * Convert git config path pattern to regex for matching
 * @param {string} pattern Git config path pattern
 * @returns {RegExp} Regular expression for matching
 */
export function pathPatternToRegex(pattern) {
  if (typeof pattern !== 'string') {
    return new RegExp('');
  }
  
  // Convert git's glob patterns to regex patterns
  let regexPattern = pattern
    .replace(/\\/g, '/')     // Normalize slashes
    .replace(/\./g, '\\.')   // Escape dots
    .replace(/\*\*/g, '.*')  // ** becomes .* (any characters)
    .replace(/\*/g, '[^/]*'); // * becomes [^/]* (any characters except /)
  
  return new RegExp(`^${regexPattern}`);
}

/**
 * Get standard paths for git config files
 * @returns {Object} Object containing standard paths
 */
export function getStandardPaths() {
  const homeDir = process.env.NODE_ENV === 'test' 
    ? tmp.dirSync({ unsafeCleanup: true }).name
    : os.homedir();
  
  return {
    homeDir,
    gitConfigPath: path.join(homeDir, '.gitconfig'),
    gitConfigDirPath: path.join(homeDir, '.gitconfig.d'),
    configFilePath: path.join(homeDir, '.gitcontexts')
  };
}

/**
 * Expand tilde (~) in paths to the home directory
 * @param {string} inputPath Path potentially containing tilde
 * @param {string} [testHomeDir] Optional home directory path (for testing)
 * @returns {string} Path with tilde expanded to home directory
 */
export function expandPath(inputPath, testHomeDir) {
  if (!inputPath) {
    return inputPath;
  }
  
  // Use the provided home directory or get it from the OS
  const homeDir = testHomeDir || os.homedir();
  
  // Only replace tilde at the beginning of the path
  if (inputPath.startsWith('~')) {
    return inputPath.replace(/^~/, homeDir);
  }
  
  return inputPath;
}

/**
 * Check if a path matches a pattern
 * @param {string} currentPath Path to check
 * @param {string} pattern Pattern to match against
 * @param {string} [testHomeDir] Optional home directory path (for testing)
 * @returns {boolean} True if path matches pattern
 */
export function matchPath(currentPath, pattern, testHomeDir) {
  if (!currentPath || !pattern) {
    return false;
  }
  
  // Expand tilde in pattern
  const expandedPattern = expandPath(pattern, testHomeDir);
  
  // Convert pattern to regex and test
  const regex = pathPatternToRegex(expandedPattern);
  return regex.test(currentPath);
}

/**
 * Create a full path by joining base and relative paths
 * @param {string} basePath Base path
 * @param {string} relativePath Relative path to append
 * @returns {string} Joined path
 */
export function createFullPath(basePath, relativePath) {
  if (!relativePath) {
    return basePath;
  }
  
  return path.join(basePath, relativePath);
}