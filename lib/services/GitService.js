/**
 * Git service for Git Context Switcher
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { validatePathSafety } from '../utils/security.js';

const execAsync = promisify(exec);

export class GitService {
  /**
   * Check if git is installed
   * @returns {Promise<boolean>} True if git is installed
   * @throws {Error} If git is not installed
   */
  async checkInstalled() {
    try {
      await execAsync('git --version');
      return true;
    } catch (error) {
      throw new Error('Git is not installed or not in your PATH. Please install Git first.');
    }
  }

  /**
   * Get active git configuration for current directory
   * @returns {Promise<string>} Git configuration output
   */
  async getActiveConfig() {
    try {
      const { stdout } = await execAsync('git config --list');
      return stdout;
    } catch (error) {
      throw new Error(`Failed to get git configuration: ${error.message}`);
    }
  }

  /**
   * Parse git config content and remove conditional includes
   * @param {string} configContent Git config content
   * @returns {string} Cleaned config content
   */
  removeConditionalIncludes(configContent) {
    if (!configContent) return '';
    
    // Split by sections
    const lines = configContent.split('\n');
    const filteredLines = [];
    let skipSection = false;
    
    for (const line of lines) {
      // Check if this is a start of a conditional include section
      if (line.trim().startsWith('[includeIf "gitdir:')) {
        skipSection = true;
        continue;
      }
      
      // Check if this is a start of a new section (not a conditional include)
      if (line.trim().startsWith('[') && !line.trim().startsWith('[includeIf')) {
        skipSection = false;
      }
      
      // Add the line if we're not skipping the current section
      if (!skipSection) {
        filteredLines.push(line);
      }
    }
    
    return filteredLines.join('\n');
  }

  /**
   * Generate conditional include sections for contexts
   * @param {Array} contexts Array of context objects
   * @param {string} basePath Base path for config files
   * @returns {string} Generated include sections
   */
  generateConditionalIncludes(contexts, basePath) {
    if (!contexts || !Array.isArray(contexts) || contexts.length === 0) {
      return '';
    }
    
    let includesSection = '';
    
    for (const context of contexts) {
      // Validate context before adding to gitconfig
      if (!context.name || !context.pathPattern || typeof context.name !== 'string' || typeof context.pathPattern !== 'string') {
        continue;
      }
      
      const configPath = path.join(basePath, `${context.name}.gitconfig`);
      
      // Verify the path is within the expected directory
      if (!validatePathSafety(basePath, configPath)) {
        continue;
      }
      
      includesSection += `[includeIf "gitdir:${context.pathPattern}"]
    path = ${configPath}

`;
    }
    
    return includesSection;
  }
}