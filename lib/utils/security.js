/**
 * Security utilities for Git Context Switcher
 */

/**
 * Sanitize input to prevent command injection
 * @param {string} input The input string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }
  // Remove any potentially dangerous characters
  return input.replace(/[;&|`$(){}[\]\\"'*?~<>]/g, '');
}

/**
 * Validate that a path is within an expected base directory
 * @param {string} basePath Base directory path
 * @param {string} targetPath Path to validate
 * @returns {boolean} True if path is safe
 */
export function validatePathSafety(basePath, targetPath) {
  if (!targetPath || !basePath) {
    return false;
  }
  
  return targetPath.startsWith(basePath);
}

/**
 * Validate context name format
 * @param {string} name Context name to validate
 * @returns {boolean} True if name is valid
 */
export function validateContextName(name) {
  if (typeof name !== 'string' || name.trim() === '') {
    return false;
  }
  
  // Validate the name format (alphanumeric, hyphens, and underscores only)
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

/**
 * Validate email format
 * @param {string} email Email to validate
 * @returns {boolean} True if email is valid
 */
export function validateEmail(email) {
  if (typeof email !== 'string' || email.trim() === '') {
    return false;
  }
  
  // Basic email validation
  return /^[^@]+@[^@]+\.[^@]+$/.test(email);
}

/**
 * Validate path pattern for safety
 * @param {string} pattern Path pattern to validate
 * @returns {boolean} True if pattern is safe
 */
export function validatePathPattern(pattern) {
  if (typeof pattern !== 'string' || pattern.trim() === '') {
    return false;
  }
  
  // Check for dangerous path traversal or command injection characters
  return !pattern.includes('..') && !/[;&|`$(){}[\]\\"']/g.test(pattern);
}