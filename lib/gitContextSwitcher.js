import { FileSystem } from "./services/FileSystem.js";
import { GitService } from "./services/GitService.js";
import { UserInterface } from "./services/UserInterface.js";
import { Context } from "./models/Context.js";
import { pathPatternToRegex } from "./utils/pathUtils.js";
import path from "path";

/**
 * Create an instance of the GitContextSwitcher
 */
export function createGitContextSwitcher() {
  return new GitContextSwitcher();
}

class GitContextSwitcher {
  constructor() {
    this.fileSystem = new FileSystem();
    this.gitService = new GitService();
    this.ui = new UserInterface();
  }

  /**
   * Run interactive setup wizard
   */
  async runSetupWizard() {
    try {
      this.ui.displayHeader("Git Context Switcher - Setup Wizard");

      // Check if git is installed
      await this.gitService.checkInstalled();

      // Check if we have permissions to the required files
      await this.fileSystem.checkPermissions([
        this.fileSystem.gitConfigPath,
        this.fileSystem.gitConfigDirPath,
        this.fileSystem.configFilePath,
      ]);

      // Create configuration directory if it doesn't exist
      await this.fileSystem.ensureConfigDirectoryExists();

      // Backup existing git config
      const backupPath = await this.fileSystem.backupGitConfig();
      if (backupPath) {
        this.ui.displaySuccess(
          `Backed up existing git config to ${backupPath}`
        );
      }

      // Get contexts from user
      const contexts = await this.ui.getContextsFromUser();

      // Save context configs
      for (const context of contexts) {
        await this.fileSystem.saveContextConfig(
          context.name,
          context.toConfigFileContent()
        );
      }

      // Save contexts metadata
      await this.fileSystem.saveContexts(contexts);

      // Update main git config
      await this._updateMainGitConfig(contexts);

      this.ui.displaySuccess("Git Context Switcher setup complete!");
      this.ui.displayContexts(contexts, this.fileSystem.gitConfigDirPath);
    } catch (error) {
      this.ui.displayError(error.message);
    }
  }

  /**
   * List all configured contexts
   */
  async listContexts() {
    try {
      const contextObjects = await this.fileSystem.loadContexts();

      // Convert plain objects to Context instances
      const contexts = contextObjects.map((obj) => Context.fromObject(obj));

      this.ui.displayContextsList(contexts, this.fileSystem.gitConfigDirPath);

      // For each context, show config details if available
      for (const context of contexts) {
        const configContent = await this.fileSystem.readContextConfig(
          context.name
        );
        if (configContent) {
          // Use the UI service methods instead of direct chalk calls
          console.log("\n   Configuration:");
          console.log("   -----------------------------------");
          console.log("   " + configContent.replace(/\n/g, "\n   "));
        }
      }
    } catch (error) {
      this.ui.displayError(error.message);
    }
  }

  /**
   * Add a new context
   */
  async addContext() {
    try {
      // Check permissions first
      const contextConfigPath = path.join(
        this.fileSystem.gitConfigDirPath,
        "temp-check.gitconfig"
      );
      await this.fileSystem.checkPermissions([
        this.fileSystem.gitConfigPath,
        contextConfigPath,
        this.fileSystem.configFilePath,
      ]);

      await this.fileSystem.ensureConfigDirectoryExists();

      // Load existing contexts
      const contextObjects = (await this.fileSystem.loadContexts()) || [];
      const existingNames = contextObjects.map((c) => c.name);

      // Get new context from user
      const context = await this.ui.getContextFromUser();

      // Check for duplicate
      if (existingNames.includes(context.name)) {
        throw new Error(`Context "${context.name}" already exists`);
      }

      // Validate the context
      const validation = context.validate();
      if (!validation.isValid) {
        throw new Error(`Invalid context: ${validation.errors.join(", ")}`);
      }

      // Save context config
      await this.fileSystem.saveContextConfig(
        context.name,
        context.toConfigFileContent()
      );

      // Add to contexts list and save
      contextObjects.push(context);
      await this.fileSystem.saveContexts(contextObjects);

      // Update main git config
      await this._updateMainGitConfig(contextObjects);

      this.ui.displaySuccess(`Context "${context.name}" added successfully!`);
    } catch (error) {
      this.ui.displayError(error.message);
    }
  }

  /**
   * Remove an existing context
   */
  async removeContext() {
    try {
      // Load existing contexts
      const contextObjects = await this.fileSystem.loadContexts();

      if (!contextObjects || contextObjects.length === 0) {
        this.ui.displayWarning(
          "No contexts configured yet. Nothing to remove."
        );
        return;
      }

      // Convert plain objects to Context instances
      const contexts = contextObjects.map((obj) => Context.fromObject(obj));

      // Get context name to remove
      const contextName = await this.ui.selectContextToRemove(contexts);

      if (!contextName) {
        return;
      }

      // Check permissions
      const configPath = path.join(
        this.fileSystem.gitConfigDirPath,
        `${contextName}.gitconfig`
      );
      await this.fileSystem.checkPermissions([
        this.fileSystem.gitConfigPath,
        configPath,
        this.fileSystem.configFilePath,
      ]);

      // Remove context config file
      await this.fileSystem.deleteContextConfig(contextName);

      // Update contexts list
      const filteredContexts = contextObjects.filter(
        (c) => c.name !== contextName
      );
      await this.fileSystem.saveContexts(filteredContexts);

      // Update main git config
      await this._updateMainGitConfig(filteredContexts);

      this.ui.displaySuccess(`Context "${contextName}" removed successfully!`);
    } catch (error) {
      this.ui.displayError(error.message);
    }
  }

  /**
   * Apply context based on current directory
   */
  async applyContext() {
    try {
      // Load existing contexts
      const contextObjects = await this.fileSystem.loadContexts();

      if (!contextObjects || contextObjects.length === 0) {
        this.ui.displayWarning(
          "No contexts configured yet. Run setup to configure contexts."
        );
        return;
      }

      // Convert plain objects to Context instances
      const contexts = contextObjects.map((obj) => Context.fromObject(obj));

      // Get current directory
      const currentDir = process.cwd();

      // Find the first matching context based on path pattern
      let matchedContext = null;
      for (const context of contexts) {
        const pattern = pathPatternToRegex(context.pathPattern);
        if (pattern.test(currentDir)) {
          matchedContext = context;
          break;
        }
      }

      // Get active git config
      let activeConfig = "";
      try {
        activeConfig = await this.gitService.getActiveConfig();
      } catch (err) {
        // Silently ignore git config errors
      }

      // Display result
      this.ui.displayActiveContext(
        matchedContext,
        this.fileSystem.gitConfigDirPath,
        activeConfig
      );
    } catch (error) {
      this.ui.displayError(error.message);
    }
  }

  /**
   * Detect context based on repository URL
   */
  async detectContextFromUrl() {
    try {
      // Load existing contexts
      const contextObjects = await this.fileSystem.loadContexts();

      if (!contextObjects || contextObjects.length === 0) {
        this.ui.displayWarning(
          "No contexts configured yet. Run setup to configure contexts."
        );
        return;
      }

      // Convert plain objects to Context instances
      const contexts = contextObjects.map((obj) => Context.fromObject(obj));

      // Get repository URL from current directory
      const repoUrl = await this.gitService.getRepositoryUrl();

      if (!repoUrl) {
        this.ui.displayWarning(
          "No git repository found in the current directory, or no remote URL configured."
        );
        return;
      }

      // Find matching context
      const matchedContext = this.gitService.detectContextFromUrl(
        contexts,
        repoUrl
      );

      // Display result
      if (matchedContext) {
        this.ui.displaySuccess(
          `Repository URL "${repoUrl}" matches context: ${matchedContext.name}`
        );

        // Get active git config
        let activeConfig = "";
        try {
          activeConfig = await this.gitService.getActiveConfig();
        } catch (err) {
          // Silently ignore git config errors
        }

        this.ui.displayActiveContext(
          matchedContext,
          this.fileSystem.gitConfigDirPath,
          activeConfig
        );
      } else {
        this.ui.displayWarning(
          `Repository URL "${repoUrl}" does not match any configured context URL patterns.`
        );
      }
    } catch (error) {
      this.ui.displayError(error.message);
    }
  }

  /**
   * Export contexts to a file
   */
  async exportContexts() {
    try {
      // Load existing contexts
      const contextObjects = await this.fileSystem.loadContexts();

      if (!contextObjects || contextObjects.length === 0) {
        this.ui.displayWarning(
          "No contexts configured yet. Nothing to export."
        );
        return;
      }

      // Get export path from user
      const exportPath = await this.ui.getExportPath();

      // Export contexts
      const exportedPath = await this.fileSystem.exportContexts(
        contextObjects,
        exportPath
      );

      this.ui.displaySuccess(`Contexts exported successfully to ${exportPath}`);
      this.ui.displayContextsWithUrlPatterns(
        contextObjects,
        this.fileSystem.gitConfigDirPath
      );
    } catch (error) {
      this.ui.displayError(error.message);
    }
  }

  /**
   * Import contexts from a file
   */
  async importContexts() {
    try {
      // Get import path from user
      const importPath = await this.ui.getImportPath();

      // Import contexts
      const importedContexts = await this.fileSystem.importContexts(importPath);

      if (!importedContexts || importedContexts.length === 0) {
        this.ui.displayWarning("No contexts found in the import file.");
        return;
      }

      // Convert to Context instances and validate
      const validContexts = [];
      const invalidContexts = [];

      for (const contextObj of importedContexts) {
        try {
          const context = Context.fromObject(contextObj);
          const validation = context.validate();

          if (validation.isValid) {
            validContexts.push(context);
          } else {
            invalidContexts.push({
              name: context.name,
              errors: validation.errors,
            });
          }
        } catch (error) {
          invalidContexts.push({
            name: contextObj.name || "Unknown",
            errors: [error.message],
          });
        }
      }

      // Show warnings for invalid contexts
      if (invalidContexts.length > 0) {
        this.ui.displayWarning(
          `${invalidContexts.length} contexts could not be imported due to validation errors:`
        );
        for (const invalid of invalidContexts) {
          console.log(`  - ${invalid.name}: ${invalid.errors.join(", ")}`);
        }
      }

      // If no valid contexts, exit
      if (validContexts.length === 0) {
        this.ui.displayError("No valid contexts found in the import file.");
        return;
      }

      // Confirm which contexts to import
      const { selectedContexts, confirmation } =
        await this.ui.selectContextsToImport(validContexts);

      if (!confirmation || selectedContexts.length === 0) {
        this.ui.displayWarning("Import cancelled.");
        return;
      }

      // Load existing contexts
      const existingContexts = (await this.fileSystem.loadContexts()) || [];

      // Check for duplicate context names
      const existingNames = existingContexts.map((c) => c.name);
      const duplicates = [];
      const newContexts = [];

      for (const context of selectedContexts) {
        if (existingNames.includes(context.name)) {
          duplicates.push(context.name);
        } else {
          newContexts.push(context);
        }
      }

      // Handle duplicates
      if (duplicates.length > 0) {
        const { replaceExisting } = await this.ui.confirmReplaceDuplicates(
          duplicates
        );

        if (replaceExisting) {
          // Replace existing contexts with the same name
          const merged = [
            ...existingContexts.filter((c) => !duplicates.includes(c.name)),
            ...selectedContexts,
          ];

          // Save merged contexts
          await this.fileSystem.saveContexts(merged);

          // Save context configs
          for (const context of selectedContexts) {
            await this.fileSystem.saveContextConfig(
              context.name,
              context.toConfigFileContent()
            );
          }

          // Update main git config
          await this._updateMainGitConfig(merged);

          this.ui.displaySuccess(
            `Imported ${selectedContexts.length} contexts (replaced ${duplicates.length} existing contexts).`
          );
        } else {
          // Only import non-duplicate contexts
          const nonDuplicates = selectedContexts.filter(
            (c) => !duplicates.includes(c.name)
          );

          if (nonDuplicates.length === 0) {
            this.ui.displayWarning(
              "No contexts imported due to name conflicts."
            );
            return;
          }

          // Merge with existing contexts
          const merged = [...existingContexts, ...nonDuplicates];

          // Save merged contexts
          await this.fileSystem.saveContexts(merged);

          // Save context configs
          for (const context of nonDuplicates) {
            await this.fileSystem.saveContextConfig(
              context.name,
              context.toConfigFileContent()
            );
          }

          // Update main git config
          await this._updateMainGitConfig(merged);

          this.ui.displaySuccess(
            `Imported ${nonDuplicates.length} contexts (skipped ${duplicates.length} duplicate contexts).`
          );
        }
      } else {
        // No duplicates, just add all selected contexts
        const merged = [...existingContexts, ...selectedContexts];

        // Save merged contexts
        await this.fileSystem.saveContexts(merged);

        // Save context configs
        for (const context of selectedContexts) {
          await this.fileSystem.saveContextConfig(
            context.name,
            context.toConfigFileContent()
          );
        }

        // Update main git config
        await this._updateMainGitConfig(merged);

        this.ui.displaySuccess(`Imported ${selectedContexts.length} contexts.`);
      }

      // Display the updated contexts
      const updatedContextObjects = await this.fileSystem.loadContexts();
      this.ui.displayContextsWithUrlPatterns(
        updatedContextObjects,
        this.fileSystem.gitConfigDirPath
      );
    } catch (error) {
      this.ui.displayError(error.message);
    }
  }

  /**
   * List available templates
   */
  async listTemplates() {
    try {
      const templates = Context.getTemplates();
      this.ui.displayTemplates(templates);
    } catch (error) {
      this.ui.displayError(error.message);
    }
  }

  /**
   * Update main git config with conditional includes
   * @private
   */
  async _updateMainGitConfig(contexts) {
    // Read existing config
    let configContent = await this.fileSystem.readGitConfig();

    // Remove existing conditional includes
    configContent = this.gitService.removeConditionalIncludes(configContent);

    // Generate new includes section
    const includesSection = this.gitService.generateConditionalIncludes(
      contexts,
      this.fileSystem.gitConfigDirPath
    );

    // Append the new includes
    configContent += "\n" + includesSection;

    // Write the updated config
    await this.fileSystem.writeGitConfig(configContent);
  }
}
