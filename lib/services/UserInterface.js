/**
 * User Interface service for Git Context Switcher
 */
import inquirer from "inquirer";
import chalk from "chalk";
import path from "path";
import { Context } from "../models/Context.js";
import {
  validateContextName,
  validateEmail,
  validatePathPattern,
  validateUrlPattern,
} from "../utils/security.js";

export class UserInterface {
  /**
   * Display a header with formatting
   * @param {string} title Header title
   */
  displayHeader(title) {
    console.log(chalk.blue("========================================"));
    console.log(chalk.blue(title));
    console.log(chalk.blue("========================================"));
  }

  /**
   * Display a success message
   * @param {string} message Message to display
   */
  displaySuccess(message) {
    console.log(chalk.green(`\n✅ ${message}`));
  }

  /**
   * Display an error message
   * @param {string} message Error message
   */
  displayError(message) {
    console.error(chalk.red(`\n❌ Error: ${message}`));
  }

  /**
   * Display a warning message
   * @param {string} message Warning message
   */
  displayWarning(message) {
    console.log(chalk.yellow(`\n⚠️ ${message}`));
  }

  /**
   * Display info about setup
   */
  displaySetupInfo() {
    console.log(
      "\nLet's set up your Git contexts. For each context, you'll need to provide:"
    );
    console.log('  - A name (e.g., "personal", "work")');
    console.log(
      '  - A path pattern to match repositories for this context (e.g., "~/personal/**")'
    );
    console.log("  - User details (name, email) for the context");
  }

  /**
   * Display configured contexts with beautiful formatting
   * @param {Array} contexts Array of context objects
   * @param {string} gitConfigDirPath Path to git config directory
   */
  displayContexts(contexts, gitConfigDirPath) {
    if (!contexts || contexts.length === 0) {
      return;
    }

    console.log(chalk.blue("\n📋 Your Git Context Configurations:"));
    console.log(
      chalk.blue("═════════════════════════════════════════════════")
    );

    for (let i = 0; i < contexts.length; i++) {
      const context = contexts[i];

      // Use different colors for alternating contexts for better readability
      const contextColor = i % 2 === 0 ? chalk.magenta : chalk.cyan;
      const nameColor = chalk.bold.white.bgHex(
        i % 2 === 0 ? "#6A0DAD" : "#0D6A9D"
      );

      console.log(
        `\n${nameColor(` ${context.name.toUpperCase()} `)} ${contextColor(
          "Context"
        )}`
      );
      console.log(
        contextColor("─────────────────────────────────────────────────")
      );

      // User details with icons
      console.log(
        `${chalk.green("👤")} ${chalk.yellow("User Name:")}  ${chalk.white(
          context.userName
        )}`
      );
      console.log(
        `${chalk.green("📧")} ${chalk.yellow("User Email:")} ${chalk.white(
          context.userEmail
        )}`
      );

      // Path pattern with icon
      console.log(
        `${chalk.green("📂")} ${chalk.yellow("Path Pattern:")} ${chalk.white(
          context.pathPattern
        )}`
      );

      // GPG signing info if available
      if (context.signingKey) {
        console.log(
          `${chalk.green("🔑")} ${chalk.yellow("Signing Key:")} ${chalk.white(
            context.signingKey
          )}`
        );
        console.log(
          `${chalk.green("✍️")} ${chalk.yellow("Auto Sign:")}   ${
            context.autoSign ? chalk.green("Enabled") : chalk.red("Disabled")
          }`
        );
      }

      // Config file location
      const configPath = path.join(
        gitConfigDirPath,
        `${context.name}.gitconfig`
      );
      console.log(
        `${chalk.green("📄")} ${chalk.yellow("Config File:")} ${chalk.dim(
          configPath
        )}`
      );

      // Add instructions for testing
      if (i === contexts.length - 1) {
        console.log(
          chalk.blue("\n═════════════════════════════════════════════════")
        );
        console.log(
          `${chalk.green("💡")} ${chalk.white(
            "To check which context applies to your current directory:"
          )}`
        );
        console.log(
          `   ${chalk.cyan("Run:")} ${chalk.white("git-context apply")}`
        );
      }
    }
  }

  /**
   * Display simple list of contexts
   * @param {Array} contexts Array of context objects
   * @param {string} gitConfigDirPath Path to git config directory
   */
  displayContextsList(contexts, gitConfigDirPath) {
    if (!contexts || contexts.length === 0) {
      this.displayWarning(
        "No contexts configured yet. Run setup to configure contexts."
      );
      return;
    }

    console.log(chalk.blue("Configured Git Contexts:"));
    console.log(chalk.blue("===================================="));

    for (const context of contexts) {
      console.log(chalk.green(`\n🔹 Context: ${chalk.bold(context.name)}`));
      console.log(`   Path Pattern: ${chalk.cyan(context.pathPattern)}`);
      console.log(
        `   Config File: ${chalk.cyan(
          path.join(gitConfigDirPath, `${context.name}.gitconfig`)
        )}`
      );
    }
  }

  /**
   * Display active context information
   * @param {Object} context Matched context or null
   * @param {string} gitConfigDirPath Path to git config directory
   * @param {string} activeConfig Active git configuration
   */
  displayActiveContext(context, gitConfigDirPath, activeConfig) {
    if (context) {
      this.displaySuccess(
        `Current path matches context: ${chalk.bold(context.name)}`
      );
      console.log(
        chalk.green(
          `Using git config from: ${path.join(
            gitConfigDirPath,
            `${context.name}.gitconfig`
          )}`
        )
      );

      console.log(chalk.dim("\nActive Git Configuration:"));
      console.log(chalk.dim("-----------------------------------"));
      console.log(chalk.dim(activeConfig));
    } else {
      this.displayWarning(
        "Current directory does not match any configured context."
      );
      console.log(chalk.yellow("Using default git configuration."));
    }
  }

  /**
   * Get a single context from user input
   * @returns {Promise<Context>} Created context
   */
  async getContextFromUser() {
    // First ask if user wants to use a template
    const { useTemplate } = await inquirer.prompt([
      {
        type: "confirm",
        name: "useTemplate",
        message: "Would you like to use a template for this context?",
        default: false,
      },
    ]);

    if (useTemplate) {
      const templates = Context.getTemplates();
      this.displayTemplates(templates);

      const { templateName } = await inquirer.prompt([
        {
          type: "list",
          name: "templateName",
          message: "Select a template:",
          choices: templates.map((t) => t.name),
        },
      ]);

      const { contextName } = await inquirer.prompt([
        {
          type: "input",
          name: "contextName",
          message: "Context name (e.g., personal, work):",
          validate: (input) => {
            const trimmed = input.trim();
            if (trimmed === "") return "Context name is required";
            if (!validateContextName(trimmed)) {
              return "Context name can only contain letters, numbers, hyphens, and underscores";
            }
            return true;
          },
        },
      ]);

      // Create context from template
      const context = Context.fromTemplate(contextName, templateName);

      // Ask for remaining required information
      const { pathPattern, userName, userEmail } = await inquirer.prompt([
        {
          type: "input",
          name: "pathPattern",
          message:
            "Path pattern for repositories (e.g., ~/personal/**, /work/**):",
          validate: (input) => {
            const trimmed = input.trim();
            if (trimmed === "") return "Path pattern is required";
            if (!validatePathPattern(trimmed)) {
              return "Path pattern contains invalid characters";
            }
            return true;
          },
        },
        {
          type: "input",
          name: "userName",
          message: "Git user name for this context:",
          validate: (input) =>
            input.trim() !== "" ? true : "User name is required",
        },
        {
          type: "input",
          name: "userEmail",
          message: "Git user email for this context:",
          validate: (input) => {
            const trimmed = input.trim();
            if (trimmed === "") return "User email is required";
            if (!validateEmail(trimmed)) {
              return "Please enter a valid email address";
            }
            return true;
          },
        },
      ]);

      // Update context with user input
      context.pathPatterns = [pathPattern.trim()];
      context.pathPattern = pathPattern.trim(); // For backward compatibility
      context.gitConfig["user.name"] = userName.trim();
      context.userName = userName.trim();
      context.gitConfig["user.email"] = userEmail.trim();
      context.userEmail = userEmail.trim();

      // If template has signingKey enabled, ask for the key
      if (context.gitConfig["commit.gpgsign"] === "true") {
        const { addSigningKey } = await inquirer.prompt([
          {
            type: "confirm",
            name: "addSigningKey",
            message:
              "Would you like to configure a GPG signing key for this context?",
            default: true,
          },
        ]);

        if (addSigningKey) {
          const { signingKey } = await inquirer.prompt([
            {
              type: "input",
              name: "signingKey",
              message: "GPG signing key ID:",
              validate: (input) => {
                const trimmed = input.trim();
                if (trimmed === "") return "Signing key is required";
                if (!/^[A-F0-9]+$/i.test(trimmed)) {
                  return "GPG key should be a hexadecimal value";
                }
                return true;
              },
            },
          ]);

          context.gitConfig["user.signingkey"] = signingKey.trim();
          context.signingKey = signingKey.trim();
        } else {
          // If user doesn't want to add a signing key, disable auto-signing
          context.gitConfig["commit.gpgsign"] = "false";
          context.autoSign = false;
        }
      }

      return context;
    } else {
      // Original context creation flow
      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "name",
          message: "Context name (e.g., personal, work):",
          validate: (input) => {
            const trimmed = input.trim();
            if (trimmed === "") return "Context name is required";
            if (!validateContextName(trimmed)) {
              return "Context name can only contain letters, numbers, hyphens, and underscores";
            }
            return true;
          },
        },
        {
          type: "input",
          name: "pathPattern",
          message:
            "Path pattern for repositories (e.g., ~/personal/**, /work/**):",
          validate: (input) => {
            const trimmed = input.trim();
            if (trimmed === "") return "Path pattern is required";
            if (!validatePathPattern(trimmed)) {
              return "Path pattern contains invalid characters";
            }
            return true;
          },
        },
        {
          type: "input",
          name: "userName",
          message: "Git user name for this context:",
          validate: (input) =>
            input.trim() !== "" ? true : "User name is required",
        },
        {
          type: "input",
          name: "userEmail",
          message: "Git user email for this context:",
          validate: (input) => {
            const trimmed = input.trim();
            if (trimmed === "") return "User email is required";
            if (!validateEmail(trimmed)) {
              return "Please enter a valid email address";
            }
            return true;
          },
        },
        {
          type: "confirm",
          name: "addSigningKey",
          message:
            "Would you like to configure a GPG signing key for this context?",
          default: false,
        },
        {
          type: "confirm",
          name: "addUrlPatterns",
          message:
            "Would you like to add URL patterns for automatic repository detection?",
          default: true,
        },
      ]);

      let signingKey = null;
      let autoSign = false;

      if (answers.addSigningKey) {
        const signingAnswers = await inquirer.prompt([
          {
            type: "input",
            name: "signingKey",
            message: "GPG signing key ID:",
            validate: (input) => {
              const trimmed = input.trim();
              if (trimmed === "") return "Signing key is required";
              if (!/^[A-F0-9]+$/i.test(trimmed)) {
                return "GPG key should be a hexadecimal value";
              }
              return true;
            },
          },
          {
            type: "confirm",
            name: "autoSign",
            message: "Automatically sign all commits for this context?",
            default: true,
          },
        ]);

        signingKey = signingAnswers.signingKey.trim();
        autoSign = signingAnswers.autoSign;
      }

      let urlPatterns = [];
      if (answers.addUrlPatterns) {
        console.log(
          "\nAdd URL patterns for repository detection (e.g., github.com/username/*)"
        );
        console.log(
          "You can use * and ? as wildcards. Press Enter with empty input when done."
        );

        let addingUrls = true;
        while (addingUrls) {
          const { urlPattern } = await inquirer.prompt([
            {
              type: "input",
              name: "urlPattern",
              message: "URL pattern:",
              validate: (input) => {
                // Empty input is valid (to stop adding)
                if (input.trim() === "") return true;

                if (!validateUrlPattern(input)) {
                  return "URL pattern contains invalid characters";
                }
                return true;
              },
            },
          ]);

          if (urlPattern.trim() === "") {
            addingUrls = false;
          } else {
            urlPatterns.push(urlPattern.trim());
          }
        }
      }

      const pathPatterns = [answers.pathPattern.trim()];
      const gitConfig = {
        "user.name": answers.userName.trim(),
        "user.email": answers.userEmail.trim(),
      };

      if (signingKey) {
        gitConfig["user.signingkey"] = signingKey;
        gitConfig["commit.gpgsign"] = autoSign ? "true" : "false";
      }

      return new Context(
        answers.name.trim(),
        "", // Empty description
        pathPatterns,
        gitConfig,
        urlPatterns
      );
    }
  }

  /**
   * Get multiple contexts from user
   * @returns {Promise<Array>} Array of Context objects
   */
  async getContextsFromUser() {
    this.displaySetupInfo();

    const contexts = [];
    let addAnother = true;

    while (addAnother) {
      const context = await this.getContextFromUser();
      contexts.push(context);

      const answer = await inquirer.prompt([
        {
          type: "confirm",
          name: "addAnother",
          message: "Would you like to add another context?",
          default: false,
        },
      ]);

      addAnother = answer.addAnother;
    }

    return contexts;
  }

  /**
   * Prompt user to select a context to remove
   * @param {Array} contexts Available contexts
   * @returns {Promise<string>} Selected context name
   */
  async selectContextToRemove(contexts) {
    if (!contexts || contexts.length === 0) {
      return null;
    }

    const { contextName } = await inquirer.prompt([
      {
        type: "list",
        name: "contextName",
        message: "Select a context to remove:",
        choices: contexts.map((c) => c.name),
      },
    ]);

    return contextName;
  }

  /**
   * Display available templates
   * @param {Array} templates Array of templates
   */
  displayTemplates(templates) {
    console.log(chalk.blue("\nAvailable Templates:"));
    console.log(chalk.blue("===================================="));

    for (const template of templates) {
      console.log(chalk.green(`\n🔹 ${chalk.bold(template.name)}`));
      console.log(`   Description: ${chalk.cyan(template.description)}`);

      if (template.urlPatterns && template.urlPatterns.length > 0) {
        console.log(
          `   URL Patterns: ${chalk.cyan(template.urlPatterns.join(", "))}`
        );
      }
    }
  }

  /**
   * Prompt user for export file path
   * @returns {Promise<string>} Export file path
   */
  async getExportPath() {
    const { exportPath } = await inquirer.prompt([
      {
        type: "input",
        name: "exportPath",
        message: "Enter the path to export contexts:",
        default: "./git-contexts-export.json",
        validate: (input) => {
          if (input.trim() === "") return "Export path is required";
          return true;
        },
      },
    ]);

    return exportPath.trim();
  }

  /**
   * Prompt user for import file path
   * @returns {Promise<string>} Import file path
   */
  async getImportPath() {
    const { importPath } = await inquirer.prompt([
      {
        type: "input",
        name: "importPath",
        message: "Enter the path to import contexts from:",
        validate: (input) => {
          if (input.trim() === "") return "Import path is required";
          return true;
        },
      },
    ]);

    return importPath.trim();
  }

  /**
   * Display contexts with URL pattern information
   * @param {Array} contexts Array of context objects
   * @param {string} gitConfigDirPath Path to git config directory
   */
  displayContextsWithUrlPatterns(contexts, gitConfigDirPath) {
    if (!contexts || contexts.length === 0) {
      return;
    }

    console.log(chalk.blue("\n📋 Your Git Context Configurations:"));
    console.log(
      chalk.blue("═════════════════════════════════════════════════")
    );

    for (let i = 0; i < contexts.length; i++) {
      const context = contexts[i];

      // Use different colors for alternating contexts for better readability
      const contextColor = i % 2 === 0 ? chalk.magenta : chalk.cyan;
      const nameColor = chalk.bold.white.bgHex(
        i % 2 === 0 ? "#6A0DAD" : "#0D6A9D"
      );

      console.log(
        `\n${nameColor(` ${context.name.toUpperCase()} `)} ${contextColor(
          "Context"
        )}`
      );
      console.log(
        contextColor("─────────────────────────────────────────────────")
      );

      // User details with icons
      console.log(
        `${chalk.green("👤")} ${chalk.yellow("User Name:")}  ${chalk.white(
          context.userName
        )}`
      );
      console.log(
        `${chalk.green("📧")} ${chalk.yellow("User Email:")} ${chalk.white(
          context.userEmail
        )}`
      );

      // Path pattern with icon
      if (context.pathPatterns && context.pathPatterns.length > 0) {
        console.log(`${chalk.green("📂")} ${chalk.yellow("Path Patterns:")}`);
        for (const pattern of context.pathPatterns) {
          console.log(`   ${chalk.white(pattern)}`);
        }
      } else if (context.pathPattern) {
        console.log(
          `${chalk.green("📂")} ${chalk.yellow("Path Pattern:")} ${chalk.white(
            context.pathPattern
          )}`
        );
      }

      // URL patterns with icon
      if (context.urlPatterns && context.urlPatterns.length > 0) {
        console.log(`${chalk.green("🔗")} ${chalk.yellow("URL Patterns:")}`);
        for (const pattern of context.urlPatterns) {
          console.log(`   ${chalk.white(pattern)}`);
        }
      }

      // GPG signing info if available
      if (context.signingKey) {
        console.log(
          `${chalk.green("🔑")} ${chalk.yellow("Signing Key:")} ${chalk.white(
            context.signingKey
          )}`
        );
        console.log(
          `${chalk.green("✍️")} ${chalk.yellow("Auto Sign:")}   ${
            context.autoSign ? chalk.green("Enabled") : chalk.red("Disabled")
          }`
        );
      }

      // Config file location
      const configPath = path.join(
        gitConfigDirPath,
        `${context.name}.gitconfig`
      );
      console.log(
        `${chalk.green("📄")} ${chalk.yellow("Config File:")} ${chalk.dim(
          configPath
        )}`
      );
    }

    // Add instructions for testing
    console.log(
      chalk.blue("\n═════════════════════════════════════════════════")
    );
    console.log(
      `${chalk.green("💡")} ${chalk.white(
        "To check which context applies to your current directory:"
      )}`
    );
    console.log(`   ${chalk.cyan("Run:")} ${chalk.white("git-context apply")}`);
    console.log(
      `${chalk.green("💡")} ${chalk.white(
        "To detect context from repository URL:"
      )}`
    );
    console.log(
      `   ${chalk.cyan("Run:")} ${chalk.white("git-context detect-url")}`
    );
  }

  /**
   * Prompt user to select which contexts to import
   * @param {Array} contexts Available contexts to import
   * @returns {Promise<Object>} Selected contexts and confirmation
   */
  async selectContextsToImport(contexts) {
    if (!contexts || contexts.length === 0) {
      return { selectedContexts: [], confirmation: false };
    }

    // If there's only one context, ask to confirm import
    if (contexts.length === 1) {
      const { confirmation } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirmation",
          message: `Import context "${contexts[0].name}"?`,
          default: true,
        },
      ]);

      return {
        selectedContexts: confirmation ? contexts : [],
        confirmation,
      };
    }

    // For multiple contexts, allow selecting which ones to import
    const { selectedNames } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selectedNames",
        message: "Select contexts to import:",
        choices: contexts.map((c) => ({
          name: `${c.name} (${c.userName} <${c.userEmail}>)`,
          value: c.name,
          checked: true,
        })),
      },
    ]);

    if (selectedNames.length === 0) {
      return { selectedContexts: [], confirmation: false };
    }

    // Confirm the selection
    const { confirmation } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmation",
        message: `Import ${selectedNames.length} selected context(s)?`,
        default: true,
      },
    ]);

    if (!confirmation) {
      return { selectedContexts: [], confirmation: false };
    }

    // Filter contexts based on selected names
    const selectedContexts = contexts.filter((c) =>
      selectedNames.includes(c.name)
    );

    return { selectedContexts, confirmation };
  }

  /**
   * Confirm if user wants to replace existing contexts with duplicates
   * @param {Array} duplicates Array of duplicate context names
   * @returns {Promise<Object>} User's choice
   */
  async confirmReplaceDuplicates(duplicates) {
    if (!duplicates || duplicates.length === 0) {
      return { replaceExisting: false };
    }

    const { replaceExisting } = await inquirer.prompt([
      {
        type: "confirm",
        name: "replaceExisting",
        message: `Found ${
          duplicates.length
        } context(s) with existing names: ${duplicates.join(
          ", "
        )}. Replace existing contexts?`,
        default: false,
      },
    ]);

    return { replaceExisting };
  }
}
