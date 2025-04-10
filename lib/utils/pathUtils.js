/**
 * Path utilities for Git Context Switcher
 */
import path from 'path';
import os from 'os';

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
  const homeDir = os.homedir();
  
  return {
    homeDir,
    gitConfigPath: path.join(homeDir, '.gitconfig'),
    gitConfigDirPath: path.join(homeDir, '.gitconfig.d'),
    configFilePath: path.join(homeDir, '.gitcontexts')
  };
}