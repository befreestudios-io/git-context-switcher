/**
 * Git service for Git Context Switcher
 */
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { validatePathSafety } from "../utils/security.js";

// Promisify exec for async/await usage
const execAsync = promisify(exec);

export class GitService {
  constructor(execFn = execAsync) {
    // Allow for dependency injection of exec function for testing
    this._execAsync = execFn;
  }

  /**
   * Check if git is installed
   * @returns {Promise<boolean>} True if git is installed
   * @throws {Error} If git is not installed
   */
  async checkInstalled() {
    try {
      await this._execAsync("git --version");
      return true;
    } catch (error) {
      throw new Error(
        "Git is not installed or not in your PATH. Please install Git first."
      );
    }
  }

  /**
   * Get active git configuration for current directory
   * @returns {Promise<string>} Git configuration output
   */
  async getActiveConfig() {
    try {
      const { stdout } = await this._execAsync("git config --list");
      return stdout.trim();
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
    if (!configContent) return "";

    // Split by sections
    const lines = configContent.split("\n");
    const filteredLines = [];
    let skipSection = false;

    for (const line of lines) {
      // Check if this is a start of a conditional include section
      if (line.trim().startsWith('[includeIf "gitdir:')) {
        skipSection = true;
        continue;
      }

      // Check if this is a start of a new section (not a conditional include)
      if (
        line.trim().startsWith("[") &&
        !line.trim().startsWith("[includeIf")
      ) {
        skipSection = false;
      }

      // Add the line if we're not skipping the current section
      if (!skipSection) {
        filteredLines.push(line);
      }
    }

    return filteredLines.join("\n");
  }

  /**
   * Generate conditional include sections for contexts
   * @param {Array} contexts Array of context objects
   * @param {string} basePath Base path for config files
   * @returns {string} Generated include sections
   */
  generateConditionalIncludes(contexts, basePath) {
    if (!contexts || !Array.isArray(contexts) || contexts.length === 0) {
      return "";
    }

    let includesSection = "";

    for (const context of contexts) {
      // Validate context before adding to gitconfig
      if (!context.name || typeof context.name !== "string") {
        continue;
      }

      // Get path patterns from context, supporting both legacy single pathPattern
      // and new array of pathPatterns
      const pathPatterns = [];

      if (context.pathPattern && typeof context.pathPattern === "string") {
        // Handle legacy single pathPattern
        pathPatterns.push(context.pathPattern);
      } else if (context.pathPatterns && Array.isArray(context.pathPatterns)) {
        // Handle new array of pathPatterns
        for (const pattern of context.pathPatterns) {
          if (typeof pattern === "string" && pattern.trim()) {
            pathPatterns.push(pattern);
          }
        }
      }

      // Skip if no valid path patterns found
      if (pathPatterns.length === 0) {
        continue;
      }

      const configPath = path.join(basePath, `${context.name}.gitconfig`);

      // Verify the path is within the expected directory
      if (!validatePathSafety(basePath, configPath)) {
        continue;
      }

      // Create an include section for each path pattern
      for (const pattern of pathPatterns) {
        includesSection += `[includeIf "gitdir:${pattern}"]
    path = ${configPath}

`;
      }
    }

    return includesSection;
  }

  /**
   * Get the remote URL for the current git repository
   * @param {string} [remoteName='origin'] The name of the remote
   * @returns {Promise<string|null>} The repository URL or null if not available
   */
  async getRepositoryUrl(remoteName = "origin") {
    try {
      const { stdout } = await this._execAsync(
        `git config --get remote.${remoteName}.url`
      );
      return stdout.trim() || null;
    } catch (error) {
      // Silent fail, not all repositories have remotes
      return null;
    }
  }

  /**
   * Detect which context should be used based on the repository URL
   * @param {Array} contexts Array of context objects
   * @param {string} repoUrl Repository URL to match against
   * @returns {Object|null} Matched context or null if no match
   */
  detectContextFromUrl(contexts, repoUrl) {
    if (
      !contexts ||
      !Array.isArray(contexts) ||
      contexts.length === 0 ||
      !repoUrl
    ) {
      return null;
    }

    // Normalize URL for comparison (remove .git suffix, etc.)
    const normalizedUrl = this._normalizeGitUrl(repoUrl);

    for (const context of contexts) {
      // Skip contexts without urlPatterns
      if (
        !context.urlPatterns ||
        !Array.isArray(context.urlPatterns) ||
        context.urlPatterns.length === 0
      ) {
        continue;
      }

      // Check if any URL pattern matches
      for (const pattern of context.urlPatterns) {
        try {
          // Convert git URL pattern to regex
          const regex = this._urlPatternToRegex(pattern);
          if (regex.test(normalizedUrl)) {
            return context;
          }
        } catch (e) {
          // Skip invalid patterns
          console.error(`Invalid URL pattern: ${pattern}`);
        }
      }
    }

    return null;
  }

  /**
   * Normalize a git URL for comparison
   * @param {string} url Git URL to normalize
   * @returns {string} Normalized URL
   * @private
   */
  _normalizeGitUrl(url) {
    if (!url) return "";

    // Remove .git suffix if present
    let normalized = url.trim().replace(/\.git$/, "");

    // Convert SSH URL format to HTTPS format for easier comparison
    // Example: git@github.com:user/repo -> github.com/user/repo
    const sshMatch = normalized.match(/^git@([^:]+):(.+)$/);
    if (sshMatch) {
      normalized = `${sshMatch[1]}/${sshMatch[2]}`;
    }

    // Remove protocol prefixes for easier matching
    normalized = normalized.replace(/^(https?:\/\/|git:\/\/)/, "");

    return normalized.toLowerCase();
  }

  /**
   * Convert URL pattern to regex for matching
   * @param {string} pattern URL pattern with potential wildcards
   * @returns {RegExp} Regular expression for matching URLs
   * @private
   */
  _urlPatternToRegex(pattern) {
    if (!pattern) return new RegExp("^$");

    // Normalize the pattern for consistency
    let normalized = this._normalizeGitUrl(pattern);

    // Escape regex special characters except * and ?
    normalized = normalized.replace(/[.+^${}()|[\]\\]/g, "\\$&");

    // Convert glob patterns to regex patterns
    normalized = normalized.replace(/\*/g, ".*").replace(/\?/g, ".");

    // Ensure we match the full string
    return new RegExp(`^${normalized}$`, "i");
  }
}
