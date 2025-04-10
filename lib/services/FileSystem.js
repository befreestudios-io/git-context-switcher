/**
 * File system service for Git Context Switcher
 */
import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';
import { getStandardPaths } from '../utils/pathUtils.js';
import { validatePathSafety } from '../utils/security.js';

const fsAccess = promisify(fs.access);

export class FileSystem {
  constructor() {
    const paths = getStandardPaths();
    this.homeDir = paths.homeDir;
    this.gitConfigPath = paths.gitConfigPath;
    this.gitConfigDirPath = paths.gitConfigDirPath;
    this.configFilePath = paths.configFilePath;
    
    // Define required paths for permission checks
    this.requiredPaths = [
      this.homeDir,
      this.gitConfigPath,
      this.gitConfigDirPath
    ];
  }

  /**
   * Check file permissions to ensure we can read/write to required paths
   * @param {string[]} [paths=this.requiredPaths] Array of paths to check
   * @param {boolean} checkWrite Whether to check write permissions (default: true)
   * @returns {Promise<boolean>} True if all permissions are available
   */
  async checkPermissions(paths = this.requiredPaths, checkWrite = true) {
    const mode = checkWrite ? fs.constants.R_OK | fs.constants.W_OK : fs.constants.R_OK;
    
    for (const filePath of paths) {
      const dirPath = path.dirname(filePath);
      
      try {
        // Check if path exists
        const exists = await fs.pathExists(filePath);
        
        if (exists) {
          // If file exists, check if we can access it
          await fsAccess(filePath, mode);
        } else {
          // If file doesn't exist, check if we can write to its parent directory
          await fsAccess(dirPath, fs.constants.R_OK | fs.constants.W_OK);
        }
      } catch (error) {
        // Handle file not found errors differently from permission errors
        if (error.code === 'ENOENT') {
          // Missing file is not an issue - we'll create it when needed
          continue;
        }
        
        // Permission errors indicate we can't proceed
        if (error.code === 'EACCES') {
          return false;
        }
        
        // For any other errors, continue checking
        console.error(`Error checking permissions for ${filePath}:`, error);
      }
    }
    
    return true;
  }

  /**
   * Ensure the .gitconfig.d directory exists
   * @returns {Promise<void>}
   */
  async ensureConfigDirectoryExists() {
    if (!await fs.pathExists(this.gitConfigDirPath)) {
      await fs.mkdir(this.gitConfigDirPath);
    }
  }

  /**
   * Backup existing git config
   * @returns {Promise<string|null>} Path to backup file or null if no backup was created
   */
  async backupGitConfig() {
    if (await fs.pathExists(this.gitConfigPath)) {
      const backupPath = `${this.gitConfigPath}.backup.${Date.now()}`;
      await fs.copy(this.gitConfigPath, backupPath);
      return backupPath;
    }
    return null;
  }

  /**
   * Load contexts from config file
   * @returns {Promise<Array>} Array of context objects
   */
  async loadContexts() {
    if (!await fs.pathExists(this.configFilePath)) {
      return [];
    }
    
    return fs.readJson(this.configFilePath);
  }

  /**
   * Save contexts to config file
   * @param {Array} contexts Array of contexts to save
   * @returns {Promise<void>}
   */
  async saveContexts(contexts) {
    await fs.writeJson(this.configFilePath, contexts, { spaces: 2 });
  }

  /**
   * Read git config file
   * @returns {Promise<string>} Git config content
   */
  async readGitConfig() {
    if (!await fs.pathExists(this.gitConfigPath)) {
      return '';
    }
    
    return fs.readFile(this.gitConfigPath, 'utf8');
  }

  /**
   * Write git config file
   * @param {string} content Git config content
   * @returns {Promise<void>}
   */
  async writeGitConfig(content) {
    await fs.writeFile(this.gitConfigPath, content, { mode: 0o600 });
  }

  /**
   * Save context config file
   * @param {string} name Context name
   * @param {string} content Config file content
   * @returns {Promise<string>} Path to created config file
   * @throws {Error} If context name is invalid or path is unsafe
   */
  async saveContextConfig(name, content) {
    const configPath = path.join(this.gitConfigDirPath, `${name}.gitconfig`);
    
    // Verify the path is within the expected directory
    if (!validatePathSafety(this.gitConfigDirPath, configPath)) {
      throw new Error('Invalid configuration path');
    }
    
    await fs.writeFile(configPath, content, { mode: 0o600 });
    return configPath;
  }

  /**
   * Delete context config file
   * @param {string} name Context name
   * @returns {Promise<void>}
   * @throws {Error} If context name is invalid or path is unsafe
   */
  async deleteContextConfig(name) {
    const configPath = path.join(this.gitConfigDirPath, `${name}.gitconfig`);
    
    // Verify the path is within the expected directory
    if (!validatePathSafety(this.gitConfigDirPath, configPath)) {
      throw new Error('Invalid configuration path');
    }
    
    if (await fs.pathExists(configPath)) {
      await fs.remove(configPath);
    }
  }

  /**
   * Read context config file
   * @param {string} name Context name
   * @returns {Promise<string|null>} Config file content or null if file doesn't exist
   * @throws {Error} If context name is invalid or path is unsafe
   */
  async readContextConfig(name) {
    const configPath = path.join(this.gitConfigDirPath, `${name}.gitconfig`);
    
    // Verify the path is within the expected directory
    if (!validatePathSafety(this.gitConfigDirPath, configPath)) {
      throw new Error('Invalid configuration path');
    }
    
    if (!await fs.pathExists(configPath)) {
      return null;
    }
    
    return fs.readFile(configPath, 'utf8');
  }
}