/**
 * File system service for Git Context Switcher
 */
import fs from "fs-extra";
import path from "path";
import { getStandardPaths } from "../utils/pathUtils.js";
import { validatePathSafety } from "../utils/security.js";

// Utility for file locking operations
const lockFiles = new Map();

/**
 * Simple file locking utility to prevent concurrent writes
 * @private
 */
class FileLock {
  constructor() {
    this.locked = false;
    this.waitQueue = [];
  }

  async acquire() {
    if (!this.locked) {
      this.locked = true;
      return true;
    }

    // Return a promise that resolves when the lock is released
    return new Promise((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release() {
    if (this.waitQueue.length > 0) {
      // Release to the next in queue
      const nextResolve = this.waitQueue.shift();
      nextResolve(true);
    } else {
      this.locked = false;
    }
  }
}

/**
 * Get or create a lock for a specific file path
 * @param {string} filePath Path to lock
 * @returns {FileLock} Lock object for this file
 * @private
 */
function getLock(filePath) {
  if (!lockFiles.has(filePath)) {
    lockFiles.set(filePath, new FileLock());
  }
  return lockFiles.get(filePath);
}

/**
 * Execute a function with a file lock
 * @param {string} filePath Path to lock
 * @param {Function} fn Function to execute with the lock
 * @returns {Promise<any>} Result of the function
 * @private
 */
async function withFileLock(filePath, fn) {
  const lock = getLock(filePath);
  await lock.acquire();
  try {
    return await fn();
  } finally {
    lock.release();
  }
}

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
      this.gitConfigDirPath,
    ];

    // Create necessary directories in test mode
    if (process.env.NODE_ENV === "test") {
      this._ensureTestDirectories();
    }
  }

  /**
   * Create necessary directories for test environment
   * @private
   * @returns {boolean} True if all directories were created successfully
   */
  _ensureTestDirectories() {
    try {
      // Use pathExistsSync from fs-extra - it's a more reliable method that works in ES modules
      // Synchronously create directories to ensure they exist before tests run
      try {
        if (!fs.pathExistsSync(this.homeDir)) {
          try {
            fs.mkdirpSync(this.homeDir, { mode: 0o755 });
          } catch (dirError) {
            if (dirError.code === "EACCES") {
              console.error(
                `Permission denied: Cannot create directory ${this.homeDir}. Please check your file system permissions.`
              );
            } else {
              console.error(
                `Failed to create directory ${this.homeDir}: ${dirError.message}`
              );
            }
            return false;
          }
        }

        if (!fs.pathExistsSync(this.gitConfigDirPath)) {
          try {
            fs.mkdirpSync(this.gitConfigDirPath, { mode: 0o755 });
          } catch (dirError) {
            if (dirError.code === "EACCES") {
              console.error(
                `Permission denied: Cannot create directory ${this.gitConfigDirPath}. Please check your file system permissions.`
              );
            } else {
              console.error(
                `Failed to create directory ${this.gitConfigDirPath}: ${dirError.message}`
              );
            }
            return false;
          }
        }

        // Touch files to ensure they exist (with empty content)
        if (!fs.pathExistsSync(this.gitConfigPath)) {
          try {
            // Use exclusive file flag to prevent race conditions
            fs.outputFileSync(this.gitConfigPath, "", { mode: 0o600 });
          } catch (fileError) {
            if (fileError.code === "EACCES") {
              console.error(
                `Permission denied: Cannot create file ${this.gitConfigPath}. Please check your file system permissions.`
              );
            } else if (fileError.code === "EEXIST") {
              // File already exists - another process might have created it
              console.warn(
                `File ${this.gitConfigPath} already exists. It will not be modified.`
              );
            } else {
              console.error(
                `Failed to create file ${this.gitConfigPath}: ${fileError.message}`
              );
            }
            if (fileError.code === "EACCES") return false;
          }
        }

        if (!fs.pathExistsSync(this.configFilePath)) {
          try {
            // Use fs-extra's outputFile to create file and parent directories if needed
            fs.outputFileSync(this.configFilePath, "[]", { mode: 0o600 });
          } catch (fileError) {
            if (fileError.code === "EACCES") {
              console.error(
                `Permission denied: Cannot create file ${this.configFilePath}. Please check your file system permissions.`
              );
            } else if (fileError.code === "EEXIST") {
              // File already exists - another process might have created it
              console.warn(
                `File ${this.configFilePath} already exists. It will not be modified.`
              );
            } else {
              console.error(
                `Failed to create file ${this.configFilePath}: ${fileError.message}`
              );
            }
            if (fileError.code === "EACCES") return false;
          }
        }

        return true;
      } catch (fsError) {
        // If pathExistsSync fails, try an alternative approach with fs-extra's pathExists + sync methods
        console.error(
          `Error with fs-extra synchrouns methods: ${fsError.message}`
        );

        // Alternative approach (used as fallback)
        // Create home directory if it doesn't exist
        if (!fs.existsSync(this.homeDir)) {
          fs.mkdirpSync(this.homeDir, { mode: 0o755 });
        }

        // Create git config directory if it doesn't exist
        if (!fs.existsSync(this.gitConfigDirPath)) {
          fs.mkdirpSync(this.gitConfigDirPath, { mode: 0o755 });
        }

        // Create git config file if it doesn't exist
        if (!fs.existsSync(this.gitConfigPath)) {
          fs.outputFileSync(this.gitConfigPath, "", { mode: 0o600 });
        }

        // Create config file if it doesn't exist
        if (!fs.existsSync(this.configFilePath)) {
          fs.outputFileSync(this.configFilePath, "[]", { mode: 0o600 });
        }

        return true;
      }
    } catch (error) {
      // More descriptive error message for general errors
      if (error.code === "EACCES") {
        console.error(
          `Permission denied during test directory creation. Please check your file system permissions.`
        );
      } else {
        console.error(
          `Failed to create test directories: ${error.message}`,
          error
        );
      }
      return false;
    }
  }

  /**
   * Check file permissions to ensure we can read/write to required paths
   * @param {string[]} [paths=this.requiredPaths] Array of paths to check
   * @param {boolean} checkWrite Whether to check write permissions (default: true)
   * @returns {Promise<boolean>} True if all permissions are available
   */
  async checkPermissions(paths = this.requiredPaths, checkWrite = true) {
    const mode = checkWrite
      ? fs.constants.R_OK | fs.constants.W_OK
      : fs.constants.R_OK;

    try {
      // Process paths in smaller batches to avoid overwhelming the file system
      const batchSize = 3;
      const results = [];

      for (let i = 0; i < paths.length; i += batchSize) {
        const batch = paths.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (filePath) => {
            try {
              // First check if the path exists - this is more mock-friendly
              const exists = await fs.pathExists(filePath);

              if (exists) {
                // Path exists, check permissions
                await fs.access(filePath, mode);
                return true;
              } else {
                // Path doesn't exist, check parent directory permissions
                const dirPath = path.dirname(filePath);
                await fs.access(dirPath, fs.constants.R_OK | fs.constants.W_OK);
                return true;
              }
            } catch (error) {
              // Return false only for permission errors, log others but don't fail
              if (error.code === "EACCES") {
                console.error(`Permission denied for ${filePath}`);
                return false;
              }
              console.error(
                `Error checking permissions for ${filePath}:`,
                error
              );
              return true; // Non-permission errors shouldn't fail the check
            }
          })
        );

        results.push(...batchResults);
      }

      // If any path check returned false, permissions are insufficient
      return !results.includes(false);
    } catch (error) {
      console.error(`Unexpected error in checkPermissions:`, error);
      return false;
    }
  }

  /**
   * Ensure the .gitconfig.d directory exists
   * @returns {Promise<void>}
   * @throws {Error} If directory cannot be created due to permission issues
   */
  async ensureConfigDirectoryExists() {
    const dirExists = await fs.pathExists(this.gitConfigDirPath);
    if (!dirExists) {
      try {
        await fs.mkdir(this.gitConfigDirPath);
      } catch (dirError) {
        if (dirError.code === "EACCES") {
          const errorMsg = `Permission denied: Cannot create directory ${this.gitConfigDirPath}. Please check your file system permissions.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        } else if (dirError.code === "EEXIST") {
          // Directory was created by another process between our check and create
          console.warn(
            `Directory ${this.gitConfigDirPath} was created concurrently by another process.`
          );
        } else {
          const errorMsg = `Failed to create directory ${this.gitConfigDirPath}: ${dirError.message}`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }
      }
    }
  }

  /**
   * Backup existing git config
   * @returns {Promise<string|null>} Path to backup file or null if no backup was created
   */
  async backupGitConfig() {
    // First check if the file exists
    if (!(await fs.pathExists(this.gitConfigPath))) {
      return null;
    }

    // Use file locking to prevent race conditions during backup
    return withFileLock(this.gitConfigPath, async () => {
      try {
        const backupPath = `${this.gitConfigPath}.backup.${Date.now()}`;
        await fs.copy(this.gitConfigPath, backupPath);
        return backupPath;
      } catch (error) {
        if (error.code === "EACCES") {
          const errorMsg = `Permission denied: Cannot backup ${this.gitConfigPath}. Please check your file system permissions.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        } else {
          console.error(`Failed to backup git config: ${error.message}`);
          throw error;
        }
      }
    });
  }

  /**
   * Load contexts from config file
   * @returns {Promise<Array>} Array of context objects
   */
  async loadContexts() {
    if (!(await fs.pathExists(this.configFilePath))) {
      return [];
    }

    // Use file locking to prevent reading while a write is in progress
    return withFileLock(this.configFilePath, async () => {
      try {
        return await fs.readJson(this.configFilePath);
      } catch (error) {
        if (error.code === "EACCES") {
          const errorMsg = `Permission denied: Cannot read from ${this.configFilePath}. Please check your file system permissions.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        } else if (error.name === "SyntaxError") {
          console.error(`Invalid JSON in config file: ${this.configFilePath}`);
          // Return empty array instead of failing when JSON is invalid
          return [];
        } else {
          console.error(`Failed to load contexts: ${error.message}`);
          throw error;
        }
      }
    });
  }

  /**
   * Save contexts to config file
   * @param {Array} contexts Array of contexts to save
   * @returns {Promise<void>}
   */
  async saveContexts(contexts) {
    return withFileLock(this.configFilePath, async () => {
      try {
        await fs.writeJson(this.configFilePath, contexts, { spaces: 2 });
      } catch (error) {
        if (error.code === "EACCES") {
          const errorMsg = `Permission denied: Cannot write to ${this.configFilePath}. Please check your file system permissions.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        } else {
          console.error(`Failed to save contexts: ${error.message}`);
          throw error;
        }
      }
    });
  }

  /**
   * Read git config file
   * @returns {Promise<string>} Git config content
   */
  async readGitConfig() {
    if (!(await fs.pathExists(this.gitConfigPath))) {
      return "";
    }

    // Use file locking to prevent reading while a write is in progress
    return withFileLock(this.gitConfigPath, async () => {
      try {
        return await fs.readFile(this.gitConfigPath, "utf8");
      } catch (error) {
        if (error.code === "EACCES") {
          const errorMsg = `Permission denied: Cannot read from ${this.gitConfigPath}. Please check your file system permissions.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        } else {
          console.error(`Failed to read git config: ${error.message}`);
          throw error;
        }
      }
    });
  }

  /**
   * Write git config file
   * @param {string} content Git config content
   * @returns {Promise<void>}
   */
  async writeGitConfig(content) {
    return withFileLock(this.gitConfigPath, async () => {
      try {
        await fs.writeFile(this.gitConfigPath, content, { mode: 0o600 });
      } catch (error) {
        if (error.code === "EACCES") {
          const errorMsg = `Permission denied: Cannot write to ${this.gitConfigPath}. Please check your file system permissions.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        } else {
          console.error(`Failed to write git config: ${error.message}`);
          throw error;
        }
      }
    });
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
      throw new Error("Invalid configuration path");
    }

    return withFileLock(configPath, async () => {
      try {
        await fs.writeFile(configPath, content, { mode: 0o600 });
        return configPath;
      } catch (error) {
        if (error.code === "EACCES") {
          const errorMsg = `Permission denied: Cannot write to ${configPath}. Please check your file system permissions.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        } else {
          console.error(`Failed to save context config: ${error.message}`);
          throw error;
        }
      }
    });
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
      throw new Error("Invalid configuration path");
    }

    // Use file locking to prevent race conditions when checking existence and removing file
    return withFileLock(configPath, async () => {
      try {
        if (await fs.pathExists(configPath)) {
          await fs.remove(configPath);
        }
      } catch (error) {
        if (error.code === "EACCES") {
          const errorMsg = `Permission denied: Cannot delete ${configPath}. Please check your file system permissions.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        } else {
          console.error(`Failed to delete context config: ${error.message}`);
          throw error;
        }
      }
    });
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
      throw new Error("Invalid configuration path");
    }

    if (!(await fs.pathExists(configPath))) {
      return null;
    }

    // Use file locking for read operations to prevent reading while a write is in progress
    return withFileLock(configPath, async () => {
      try {
        return await fs.readFile(configPath, "utf8");
      } catch (error) {
        if (error.code === "EACCES") {
          const errorMsg = `Permission denied: Cannot read from ${configPath}. Please check your file system permissions.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        } else {
          console.error(`Failed to read context config: ${error.message}`);
          throw error;
        }
      }
    });
  }

  /**
   * Export contexts to a JSON file
   * @param {Array} contexts Array of contexts to export
   * @param {string} exportPath Path to export file
   * @returns {Promise<string>} Path to exported file
   * @throws {Error} If export path is invalid or cannot be written
   */
  async exportContexts(contexts, exportPath) {
    // Verify the export path is not within sensitive directories
    if (
      exportPath.includes(this.gitConfigDirPath) ||
      exportPath.includes(this.homeDir)
    ) {
      throw new Error(
        "Export path should not be within system or git config directories"
      );
    }

    return withFileLock(exportPath, async () => {
      try {
        await fs.writeJson(exportPath, contexts, { spaces: 2 });
        return exportPath;
      } catch (error) {
        if (error.code === "EACCES") {
          const errorMsg = `Permission denied: Cannot write to ${exportPath}. Please check your file system permissions.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        } else {
          console.error(`Failed to export contexts: ${error.message}`);
          throw error;
        }
      }
    });
  }

  /**
   * Import contexts from a JSON file
   * @param {string} importPath Path to import file
   * @returns {Promise<Array>} Array of imported contexts
   * @throws {Error} If import path is invalid or cannot be read
   */
  async importContexts(importPath) {
    if (!(await fs.pathExists(importPath))) {
      throw new Error(`Import file not found: ${importPath}`);
    }

    return withFileLock(importPath, async () => {
      try {
        const importedContexts = await fs.readJson(importPath);

        // Validate that the imported data is an array
        if (!Array.isArray(importedContexts)) {
          throw new Error(
            "Invalid import file format. Expected an array of contexts."
          );
        }

        return importedContexts;
      } catch (error) {
        if (error.code === "EACCES") {
          const errorMsg = `Permission denied: Cannot read from ${importPath}. Please check your file system permissions.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        } else if (error.name === "SyntaxError") {
          throw new Error(`Invalid JSON in import file: ${importPath}`);
        } else {
          console.error(`Failed to import contexts: ${error.message}`);
          throw error;
        }
      }
    });
  }
}

/**
 * Validate URL pattern for safety and correct format
 * @param {string} pattern URL pattern to validate
 * @returns {boolean} True if pattern is safe and valid
 */
export function validateUrlPattern(pattern) {
  if (typeof pattern !== "string" || pattern.trim() === "") {
    return false;
  }

  // Check for dangerous characters while allowing * and ? for wildcards
  return !/[;&|`$(){}[\]\\'"<>]/g.test(pattern);
}
