/**
 * Context model class representing a git context configuration
 */
import { sanitizeInput } from '../utils/security.js';
import { validateContextName, validateEmail, validatePathPattern } from '../utils/security.js';
import { normalizePathPattern } from '../utils/pathUtils.js';
import os from 'os';

export class Context {
  /**
   * Create a new Context instance
   * @param {string} name Context name
   * @param {string} pathPattern Path pattern
   * @param {string} userName Git user name
   * @param {string} userEmail Git user email
   * @param {string} [signingKey=null] GPG signing key
   * @param {boolean} [autoSign=false] Auto-sign commits
   */
  constructor(name, pathPattern, userName, userEmail, signingKey = null, autoSign = false) {
    this.name = sanitizeInput(name);
    this.pathPattern = normalizePathPattern(pathPattern, os.homedir());
    this.userName = sanitizeInput(userName);
    this.userEmail = sanitizeInput(userEmail);
    this.signingKey = signingKey ? sanitizeInput(signingKey) : null;
    this.autoSign = Boolean(autoSign);
  }

  /**
   * Validate context data
   * @returns {Object} Object containing validation results
   */
  validate() {
    const errors = [];
    
    if (!validateContextName(this.name)) {
      errors.push('Context name can only contain letters, numbers, hyphens, and underscores');
    }
    
    if (!validatePathPattern(this.pathPattern)) {
      errors.push('Path pattern contains invalid characters');
    }
    
    if (!this.userName || this.userName.trim() === '') {
      errors.push('User name is required');
    }
    
    if (!validateEmail(this.userEmail)) {
      errors.push('Please enter a valid email address');
    }
    
    if (this.signingKey && !/^[A-F0-9]+$/i.test(this.signingKey)) {
      errors.push('GPG key should be a hexadecimal value');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create context instance from plain object
   * @param {Object} obj Plain object with context data
   * @returns {Context} New Context instance
   */
  static fromObject(obj) {
    if (!obj) return null;
    
    return new Context(
      obj.name || '',
      obj.pathPattern || '',
      obj.userName || '',
      obj.userEmail || '',
      obj.signingKey || null,
      obj.autoSign || false
    );
  }

  /**
   * Convert context to a config file content
   * @returns {string} Git config file content
   */
  toConfigFileContent() {
    let configContent = `[user]
    name = ${this.userName}
    email = ${this.userEmail}
`;
    
    if (this.signingKey) {
      configContent += `\n[user]
    signingkey = ${this.signingKey}

[commit]
    gpgsign = ${this.autoSign ? 'true' : 'false'}
`;
    }
    
    return configContent;
  }
}