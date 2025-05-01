/**
 * Context model class representing a git context configuration
 */
import {
  sanitizeInput,
  validateContextName,
  validateEmail,
  validatePathPattern,
  validateUrlPattern,
} from "../utils/security.js";
import { normalizePathPattern } from "../utils/pathUtils.js";
import os from "os";

export class Context {
  /**
   * Create a new Context instance
   * @param {string} name Context name
   * @param {string} [description=''] Context description
   * @param {Array} [pathPatterns=[]] Array of path patterns
   * @param {Object} [gitConfig={}] Git configuration key-value pairs
   * @param {Array} [urlPatterns=[]] Array of repository URL patterns for automatic detection
   */
  constructor(
    name,
    description = "",
    pathPatterns = [],
    gitConfig = {},
    urlPatterns = []
  ) {
    this.name = sanitizeInput(name);
    this.description = sanitizeInput(description);
    this.pathPatterns = Array.isArray(pathPatterns) ? pathPatterns : [];
    this.gitConfig = gitConfig || {};
    this.urlPatterns = Array.isArray(urlPatterns) ? urlPatterns : [];

    // For backward compatibility
    this.pathPattern =
      this.pathPatterns.length > 0
        ? normalizePathPattern(this.pathPatterns[0], os.homedir())
        : "";

    // Extract common properties from gitConfig for convenience
    this.userName = this.gitConfig["user.name"] || "";
    this.userEmail = this.gitConfig["user.email"] || "";
    this.signingKey = this.gitConfig["user.signingkey"] || null;
    this.autoSign = this.gitConfig["commit.gpgsign"] === "true";
  }

  /**
   * Validate context data
   * @returns {Object} Object containing validation results
   */
  validate() {
    const errors = [];

    if (!validateContextName(this.name)) {
      errors.push(
        "Context name can only contain letters, numbers, hyphens, and underscores"
      );
    }

    if (this.pathPatterns.length > 0) {
      for (const pattern of this.pathPatterns) {
        if (!validatePathPattern(pattern)) {
          errors.push("Path pattern contains invalid characters");
          break;
        }
      }
    }

    if (this.urlPatterns.length > 0) {
      for (const pattern of this.urlPatterns) {
        if (!validateUrlPattern(pattern)) {
          errors.push("URL pattern contains invalid characters");
          break;
        }
      }
    }

    if (this.userName && !this.userName.trim()) {
      errors.push("User name is required");
    }

    if (this.userEmail && !validateEmail(this.userEmail)) {
      errors.push("Please enter a valid email address");
    }

    if (this.signingKey && !/^[A-F0-9]+$/i.test(this.signingKey)) {
      errors.push("GPG key should be a hexadecimal value");
    }

    return {
      isValid: errors.length === 0,
      errors,
      // Legacy property for backwards compatibility
      valid: errors.length === 0,
    };
  }

  /**
   * Create context instance from plain object
   * @param {Object} obj Plain object with context data
   * @returns {Context} New Context instance
   * @throws {Error} If object doesn't have a name property
   */
  static fromObject(obj) {
    if (!obj) return null;
    if (!obj.name) throw new Error("Context requires a name");

    return new Context(
      obj.name,
      obj.description || "",
      obj.pathPatterns || [],
      obj.gitConfig || {},
      obj.urlPatterns || []
    );
  }

  /**
   * Convert context to a plain object
   * @returns {Object} Plain object representation of this context
   */
  toObject() {
    return {
      name: this.name,
      description: this.description,
      pathPatterns: this.pathPatterns,
      gitConfig: this.gitConfig,
      urlPatterns: this.urlPatterns,
    };
  }

  /**
   * Convert context to a config file content
   * @returns {string} Git config file content
   */
  toConfigFileContent() {
    let configContent = `[user]\n`;

    if (this.userName) {
      configContent += `    name = ${this.userName}\n`;
    }

    if (this.userEmail) {
      configContent += `    email = ${this.userEmail}\n`;
    }

    if (this.signingKey) {
      configContent += `    signingkey = ${this.signingKey}\n\n`;
      configContent += `[commit]\n`;
      configContent += `    gpgsign = ${this.autoSign ? "true" : "false"}\n`;
    }

    return configContent;
  }

  /**
   * Create a context from a template
   * @param {string} name Context name
   * @param {string} templateName Template name
   * @returns {Context} New context instance based on template
   */
  static fromTemplate(name, templateName) {
    const templates = Context.getTemplates();
    const template = templates.find((t) => t.name === templateName);

    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    // Create a new context based on the template
    const context = new Context(
      name,
      template.description,
      [], // Empty pathPatterns to be filled by user
      template.gitConfig,
      template.urlPatterns
    );

    return context;
  }

  /**
   * Get available context templates
   * @returns {Array} Array of templates
   */
  static getTemplates() {
    return [
      {
        name: "personal",
        description: "Personal GitHub projects",
        gitConfig: {
          "user.name": "", // To be filled by user
          "user.email": "", // To be filled by user
        },
        urlPatterns: ["github.com/*/personal-*", "github.com/*/personal/*"],
      },
      {
        name: "work",
        description: "Work projects",
        gitConfig: {
          "user.name": "", // To be filled by user
          "user.email": "", // To be filled by user
          "commit.gpgsign": "true",
        },
        urlPatterns: [
          "github.com/*/work-*",
          "github.com/acme-corp/*", // Example company
        ],
      },
      {
        name: "client",
        description: "Client projects",
        gitConfig: {
          "user.name": "", // To be filled by user
          "user.email": "", // To be filled by user
          "commit.gpgsign": "true",
        },
        urlPatterns: ["github.com/client-*/*"],
      },
      {
        name: "opensource",
        description: "Open source contributions",
        gitConfig: {
          "user.name": "", // To be filled by user
          "user.email": "", // To be filled by user
          "commit.gpgsign": "true",
        },
        urlPatterns: ["github.com/opensource-*/*", "github.com/*/open-*"],
      },
    ];
  }
}
