/**
 * Tests for the GitContextSwitcher class
 */
import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";

// Mock dependencies before importing the main module
const mockPathPatternToRegex = jest.fn().mockReturnValue(/\/.*/);

jest.mock("../lib/utils/pathUtils.js", () => ({
  pathPatternToRegex: mockPathPatternToRegex,
}));

jest.mock("../lib/services/FileSystem.js");
jest.mock("../lib/services/GitService.js");
jest.mock("../lib/services/UserInterface.js");
jest.mock("../lib/models/Context.js");

// Now import the modules that depend on the mocks
import { createGitContextSwitcher } from "../lib/gitContextSwitcher.js";
import { Context } from "../lib/models/Context.js";

describe("GitContextSwitcher", () => {
  let switcher;
  let mockFileSystem;
  let mockGitService;
  let mockUI;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create a new instance for each test
    switcher = createGitContextSwitcher();

    // Set up references to the mocked dependencies
    mockFileSystem = switcher.fileSystem;
    mockGitService = switcher.gitService;
    mockUI = switcher.ui;

    // Setup all needed mock methods on FileSystem
    mockFileSystem.loadContexts = jest.fn().mockResolvedValue([]);
    mockFileSystem.checkPermissions = jest.fn().mockResolvedValue(true);
    mockFileSystem.ensureConfigDirectoryExists = jest.fn().mockResolvedValue();
    mockFileSystem.saveContextConfig = jest.fn().mockResolvedValue();
    mockFileSystem.saveContexts = jest.fn().mockResolvedValue();
    mockFileSystem.readGitConfig = jest.fn().mockResolvedValue("");
    mockFileSystem.writeGitConfig = jest.fn().mockResolvedValue();
    mockFileSystem.exportContexts = jest.fn().mockResolvedValue("");
    mockFileSystem.importContexts = jest.fn().mockResolvedValue([]);
    mockFileSystem.readContextConfig = jest.fn().mockResolvedValue("");
    mockFileSystem.deleteContextConfig = jest.fn().mockResolvedValue();
    mockFileSystem.backupGitConfig = jest.fn().mockResolvedValue("");

    // Setup all needed mock methods on GitService
    mockGitService.checkInstalled = jest.fn().mockResolvedValue(true);
    mockGitService.getActiveConfig = jest.fn().mockResolvedValue("");
    mockGitService.getRepositoryUrl = jest.fn().mockResolvedValue("");
    mockGitService.detectContextFromUrl = jest.fn().mockReturnValue(null);
    mockGitService.removeConditionalIncludes = jest.fn().mockReturnValue("");
    mockGitService.generateConditionalIncludes = jest.fn().mockReturnValue("");

    // Setup all needed mock methods on UI
    mockUI.displayHeader = jest.fn();
    mockUI.displaySuccess = jest.fn();
    mockUI.displayError = jest.fn();
    mockUI.displayWarning = jest.fn();
    mockUI.displayContexts = jest.fn();
    mockUI.displayContextsList = jest.fn();
    mockUI.displayActiveContext = jest.fn();
    mockUI.displayContextsWithUrlPatterns = jest.fn();
    mockUI.displayTemplates = jest.fn();
    mockUI.getContextFromUser = jest.fn().mockResolvedValue({});
    mockUI.getContextsFromUser = jest.fn().mockResolvedValue([]);
    mockUI.selectContextToRemove = jest.fn().mockResolvedValue(null);
    mockUI.getExportPath = jest.fn().mockResolvedValue("");
    mockUI.getImportPath = jest.fn().mockResolvedValue("");
    mockUI.selectContextsToImport = jest
      .fn()
      .mockResolvedValue({ selectedContexts: [], confirmation: false });
    mockUI.confirmReplaceDuplicates = jest
      .fn()
      .mockResolvedValue({ replaceExisting: false });

    // Setup all needed static methods on Context
    Context.fromObject = jest.fn().mockImplementation((obj) => obj);
    Context.getTemplates = jest.fn().mockReturnValue([]);

    // Reset the mock for pathPatternToRegex
    mockPathPatternToRegex.mockClear();
  });

  describe("runSetupWizard", () => {
    test("should display error if git is not installed", async () => {
      // Arrange
      mockGitService.checkInstalled.mockRejectedValue(
        new Error("Git not found")
      );

      // Act
      await switcher.runSetupWizard();

      // Assert
      expect(mockUI.displayError).toHaveBeenCalledWith("Git not found");
    });

    test("should display error if permissions check fails", async () => {
      // Arrange
      mockFileSystem.checkPermissions.mockRejectedValue(
        new Error("Permission denied")
      );

      // Act
      await switcher.runSetupWizard();

      // Assert
      expect(mockUI.displayError).toHaveBeenCalledWith("Permission denied");
    });

    test("should complete setup successfully with user-provided contexts", async () => {
      // Arrange
      const mockContext1 = { name: "work", toConfigFileContent: jest.fn() };
      const mockContext2 = { name: "personal", toConfigFileContent: jest.fn() };
      const mockContexts = [mockContext1, mockContext2];

      mockFileSystem.backupGitConfig.mockResolvedValue(
        "/path/to/backup.gitconfig"
      );
      mockUI.getContextsFromUser.mockResolvedValue(mockContexts);
      mockFileSystem.saveContextConfig.mockResolvedValue();
      mockFileSystem.saveContexts.mockResolvedValue();

      // Act
      await switcher.runSetupWizard();

      // Assert
      expect(mockFileSystem.backupGitConfig).toHaveBeenCalled();
      expect(mockUI.getContextsFromUser).toHaveBeenCalled();
      expect(mockFileSystem.saveContextConfig).toHaveBeenCalledTimes(2);
      expect(mockFileSystem.saveContexts).toHaveBeenCalledWith(mockContexts);
      expect(mockUI.displaySuccess).toHaveBeenCalledWith(
        "Git Context Switcher setup complete!"
      );
    });
  });

  describe("listContexts", () => {
    test("should display contexts list", async () => {
      // Arrange
      const mockContextObjs = [
        { name: "work", pathPattern: "~/work/**" },
        { name: "personal", pathPattern: "~/personal/**" },
      ];

      mockFileSystem.loadContexts.mockResolvedValue(mockContextObjs);
      Context.fromObject = jest.fn().mockImplementation((obj) => obj);
      mockFileSystem.readContextConfig.mockResolvedValue("user.name=Test User");

      // Act
      await switcher.listContexts();

      // Assert
      expect(mockFileSystem.loadContexts).toHaveBeenCalled();
      expect(Context.fromObject).toHaveBeenCalledTimes(2);
      expect(mockUI.displayContextsList).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: "work" }),
          expect.objectContaining({ name: "personal" }),
        ]),
        mockFileSystem.gitConfigDirPath
      );
    });

    test("should display error if loading contexts fails", async () => {
      // Arrange
      mockFileSystem.loadContexts.mockRejectedValue(
        new Error("Failed to load contexts")
      );

      // Act
      await switcher.listContexts();

      // Assert
      expect(mockUI.displayError).toHaveBeenCalledWith(
        "Failed to load contexts"
      );
    });
  });

  describe("addContext", () => {
    test("should add a new context successfully", async () => {
      // Arrange
      const existingContexts = [];
      const newContext = {
        name: "work",
        pathPattern: "~/work/**",
        validate: jest.fn().mockReturnValue({ isValid: true }),
        toConfigFileContent: jest.fn().mockReturnValue("user.name=Work User"),
      };

      mockFileSystem.loadContexts.mockResolvedValue(existingContexts);
      mockUI.getContextFromUser.mockResolvedValue(newContext);
      mockFileSystem.saveContextConfig.mockResolvedValue();
      mockFileSystem.saveContexts.mockResolvedValue();

      // Act
      await switcher.addContext();

      // Assert
      expect(mockFileSystem.loadContexts).toHaveBeenCalled();
      expect(mockUI.getContextFromUser).toHaveBeenCalled();
      expect(mockFileSystem.saveContextConfig).toHaveBeenCalledWith(
        "work",
        "user.name=Work User"
      );
      expect(mockFileSystem.saveContexts).toHaveBeenCalledWith([newContext]);
      expect(mockUI.displaySuccess).toHaveBeenCalledWith(
        'Context "work" added successfully!'
      );
    });

    test("should display error if context with same name already exists", async () => {
      // Arrange
      const existingContexts = [{ name: "work" }];
      const newContext = { name: "work" };

      mockFileSystem.loadContexts.mockResolvedValue(existingContexts);
      mockUI.getContextFromUser.mockResolvedValue(newContext);

      // Act
      await switcher.addContext();

      // Assert
      expect(mockUI.displayError).toHaveBeenCalledWith(
        'Context "work" already exists'
      );
    });

    test("should display error if context validation fails", async () => {
      // Arrange
      const existingContexts = [];
      const newContext = {
        name: "work",
        validate: jest.fn().mockReturnValue({
          isValid: false,
          errors: ["Missing required field"],
        }),
      };

      mockFileSystem.loadContexts.mockResolvedValue(existingContexts);
      mockUI.getContextFromUser.mockResolvedValue(newContext);

      // Act
      await switcher.addContext();

      // Assert
      expect(mockUI.displayError).toHaveBeenCalledWith(
        "Invalid context: Missing required field"
      );
    });
  });

  describe("removeContext", () => {
    test("should display warning if no contexts are configured", async () => {
      // Arrange
      mockFileSystem.loadContexts.mockResolvedValue([]);

      // Act
      await switcher.removeContext();

      // Assert
      expect(mockUI.displayWarning).toHaveBeenCalledWith(
        "No contexts configured yet. Nothing to remove."
      );
    });

    test("should remove context successfully", async () => {
      // Arrange
      const contexts = [{ name: "work" }, { name: "personal" }];

      mockFileSystem.loadContexts.mockResolvedValue(contexts);
      Context.fromObject = jest.fn().mockImplementation((obj) => obj);
      mockUI.selectContextToRemove.mockResolvedValue("work");
      mockFileSystem.deleteContextConfig.mockResolvedValue();
      mockFileSystem.saveContexts.mockResolvedValue();

      // Act
      await switcher.removeContext();

      // Assert
      expect(mockFileSystem.deleteContextConfig).toHaveBeenCalledWith("work");
      expect(mockFileSystem.saveContexts).toHaveBeenCalledWith([
        { name: "personal" },
      ]);
      expect(mockUI.displaySuccess).toHaveBeenCalledWith(
        'Context "work" removed successfully!'
      );
    });

    test("should do nothing if no context is selected for removal", async () => {
      // Arrange
      const contexts = [{ name: "work" }];

      mockFileSystem.loadContexts.mockResolvedValue(contexts);
      Context.fromObject = jest.fn().mockImplementation((obj) => obj);
      mockUI.selectContextToRemove.mockResolvedValue(null);

      // Act
      await switcher.removeContext();

      // Assert
      expect(mockFileSystem.deleteContextConfig).not.toHaveBeenCalled();
      expect(mockFileSystem.saveContexts).not.toHaveBeenCalled();
    });
  });

  describe("applyContext", () => {
    test("should display warning if no contexts are configured", async () => {
      // Arrange
      mockFileSystem.loadContexts.mockResolvedValue([]);

      // Act
      await switcher.applyContext();

      // Assert
      expect(mockUI.displayWarning).toHaveBeenCalledWith(
        "No contexts configured yet. Run setup to configure contexts."
      );
    });

    test("should find and display matching context for current directory", async () => {
      // Arrange
      const contexts = [
        { name: "work", pathPattern: "/work/**" },
        { name: "personal", pathPattern: "/personal/**" },
      ];

      mockFileSystem.loadContexts.mockResolvedValue(contexts);
      Context.fromObject = jest.fn().mockImplementation((obj) => obj);
      mockPathPatternToRegex.mockReturnValue(/\/work\/.*/);
      mockGitService.getActiveConfig.mockResolvedValue("user.name=Work User");

      // Mock process.cwd()
      const originalCwd = process.cwd;
      process.cwd = jest.fn().mockReturnValue("/work/project");

      // Act
      await switcher.applyContext();

      // Assert
      expect(mockUI.displayActiveContext).toHaveBeenCalledWith(
        contexts[0],
        mockFileSystem.gitConfigDirPath,
        "user.name=Work User"
      );

      // Restore process.cwd
      process.cwd = originalCwd;
    });
  });

  describe("detectContextFromUrl", () => {
    test("should display warning if no contexts are configured", async () => {
      // Arrange
      mockFileSystem.loadContexts.mockResolvedValue([]);

      // Act
      await switcher.detectContextFromUrl();

      // Assert
      expect(mockUI.displayWarning).toHaveBeenCalledWith(
        "No contexts configured yet. Run setup to configure contexts."
      );
    });

    test("should display warning if no repository URL is found", async () => {
      // Arrange
      const contexts = [{ name: "work" }];

      mockFileSystem.loadContexts.mockResolvedValue(contexts);
      Context.fromObject = jest.fn().mockImplementation((obj) => obj);
      mockGitService.getRepositoryUrl.mockResolvedValue(null);

      // Act
      await switcher.detectContextFromUrl();

      // Assert
      expect(mockUI.displayWarning).toHaveBeenCalledWith(
        "No git repository found in the current directory, or no remote URL configured."
      );
    });

    test("should find and display matching context for repository URL", async () => {
      // Arrange
      const contexts = [{ name: "work" }, { name: "personal" }];
      const repoUrl = "github.com/user/repo";
      const matchedContext = { name: "work" };

      mockFileSystem.loadContexts.mockResolvedValue(contexts);
      Context.fromObject = jest.fn().mockImplementation((obj) => obj);
      mockGitService.getRepositoryUrl.mockResolvedValue(repoUrl);
      mockGitService.detectContextFromUrl.mockReturnValue(matchedContext);
      mockGitService.getActiveConfig.mockResolvedValue("user.name=Work User");

      // Act
      await switcher.detectContextFromUrl();

      // Assert
      expect(mockGitService.detectContextFromUrl).toHaveBeenCalledWith(
        contexts,
        repoUrl
      );
      expect(mockUI.displaySuccess).toHaveBeenCalledWith(
        `Repository URL "${repoUrl}" matches context: work`
      );
      expect(mockUI.displayActiveContext).toHaveBeenCalledWith(
        matchedContext,
        mockFileSystem.gitConfigDirPath,
        "user.name=Work User"
      );
    });
  });

  describe("exportContexts", () => {
    test("should display warning if no contexts are configured", async () => {
      // Arrange
      mockFileSystem.loadContexts.mockResolvedValue([]);

      // Act
      await switcher.exportContexts();

      // Assert
      expect(mockUI.displayWarning).toHaveBeenCalledWith(
        "No contexts configured yet. Nothing to export."
      );
    });

    test("should export contexts successfully", async () => {
      // Arrange
      const contexts = [{ name: "work" }, { name: "personal" }];
      const exportPath = "/path/to/export.json";

      mockFileSystem.loadContexts.mockResolvedValue(contexts);
      mockUI.getExportPath.mockResolvedValue(exportPath);
      mockFileSystem.exportContexts.mockResolvedValue(exportPath);

      // Act
      await switcher.exportContexts();

      // Assert
      expect(mockFileSystem.exportContexts).toHaveBeenCalledWith(
        contexts,
        exportPath
      );
      expect(mockUI.displaySuccess).toHaveBeenCalledWith(
        `Contexts exported successfully to ${exportPath}`
      );
      expect(mockUI.displayContextsWithUrlPatterns).toHaveBeenCalledWith(
        contexts,
        mockFileSystem.gitConfigDirPath
      );
    });
  });

  describe("importContexts", () => {
    test("should display warning if no contexts found in import file", async () => {
      // Arrange
      const importPath = "/path/to/import.json";

      mockUI.getImportPath.mockResolvedValue(importPath);
      mockFileSystem.importContexts.mockResolvedValue([]);

      // Act
      await switcher.importContexts();

      // Assert
      expect(mockUI.displayWarning).toHaveBeenCalledWith(
        "No contexts found in the import file."
      );
    });

    test("should import valid contexts and display warnings for invalid ones", async () => {
      // Arrange
      const importPath = "/path/to/import.json";
      const importedContexts = [
        { name: "work" },
        { name: "personal" },
        { name: "invalid" },
      ];

      mockUI.getImportPath.mockResolvedValue(importPath);
      mockFileSystem.importContexts.mockResolvedValue(importedContexts);

      // Mock Context.fromObject and validate to make some contexts valid and others invalid
      Context.fromObject = jest.fn().mockImplementation((obj) => {
        if (obj.name === "invalid") {
          return {
            name: obj.name,
            validate: () => ({ isValid: false, errors: ["Invalid context"] }),
          };
        }
        return {
          name: obj.name,
          validate: () => ({ isValid: true }),
          toConfigFileContent: () => `user.name=${obj.name}`,
        };
      });

      mockUI.selectContextsToImport.mockResolvedValue({
        selectedContexts: [
          { name: "work", toConfigFileContent: () => "user.name=Work User" },
        ],
        confirmation: true,
      });

      mockFileSystem.loadContexts.mockResolvedValue([]);

      // Act
      await switcher.importContexts();

      // Assert
      expect(mockUI.displayWarning).toHaveBeenCalled();
      expect(mockFileSystem.saveContexts).toHaveBeenCalledWith([
        { name: "work", toConfigFileContent: expect.any(Function) },
      ]);
      expect(mockFileSystem.saveContextConfig).toHaveBeenCalled();
      expect(mockUI.displaySuccess).toHaveBeenCalledWith(
        "Imported 1 contexts."
      );
    });

    test("should handle duplicate contexts by replacing them if confirmed", async () => {
      // Arrange
      const importPath = "/path/to/import.json";
      const importedContexts = [{ name: "work" }, { name: "personal" }];
      const existingContexts = [{ name: "work" }, { name: "other" }];

      mockUI.getImportPath.mockResolvedValue(importPath);
      mockFileSystem.importContexts.mockResolvedValue(importedContexts);

      // Mock Context.fromObject to return objects with validate and toConfigFileContent methods
      Context.fromObject = jest.fn().mockImplementation((obj) => ({
        ...obj,
        validate: () => ({ isValid: true }),
        toConfigFileContent: () => `user.name=${obj.name}`,
      }));

      mockUI.selectContextsToImport.mockResolvedValue({
        selectedContexts: importedContexts.map((obj) =>
          Context.fromObject(obj)
        ),
        confirmation: true,
      });

      mockFileSystem.loadContexts.mockResolvedValue(existingContexts);

      mockUI.confirmReplaceDuplicates.mockResolvedValue({
        replaceExisting: true,
      });

      // Act
      await switcher.importContexts();

      // Assert
      expect(mockUI.confirmReplaceDuplicates).toHaveBeenCalledWith(["work"]);
      expect(mockFileSystem.saveContexts).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: "other" }),
          expect.objectContaining({ name: "work" }),
          expect.objectContaining({ name: "personal" }),
        ])
      );
      expect(mockUI.displaySuccess).toHaveBeenCalledWith(
        "Imported 2 contexts (replaced 1 existing contexts)."
      );
    });
  });

  describe("listTemplates", () => {
    test("should display available templates", async () => {
      // Arrange
      const templates = [
        { name: "work", description: "Work template" },
        { name: "personal", description: "Personal template" },
      ];

      Context.getTemplates = jest.fn().mockReturnValue(templates);

      // Act
      await switcher.listTemplates();

      // Assert
      expect(Context.getTemplates).toHaveBeenCalled();
      expect(mockUI.displayTemplates).toHaveBeenCalledWith(templates);
    });

    test("should display error if getting templates fails", async () => {
      // Arrange
      Context.getTemplates = jest.fn().mockImplementation(() => {
        throw new Error("Failed to get templates");
      });

      // Act
      await switcher.listTemplates();

      // Assert
      expect(mockUI.displayError).toHaveBeenCalledWith(
        "Failed to get templates"
      );
    });
  });

  describe("_updateMainGitConfig", () => {
    test("should update git config with conditional includes", async () => {
      // Arrange
      const contexts = [{ name: "work" }, { name: "personal" }];
      const existingConfig = "[core]\n\tautoCRLF = input\n";
      const includesSection =
        '[includeIf "gitdir:~/work/**"]\n\tpath = ~/.gitconfig.d/work.gitconfig\n';

      mockFileSystem.readGitConfig.mockResolvedValue(existingConfig);
      mockGitService.removeConditionalIncludes.mockReturnValue(existingConfig);
      mockGitService.generateConditionalIncludes.mockReturnValue(
        includesSection
      );
      mockFileSystem.writeGitConfig.mockResolvedValue();

      // Act
      await switcher._updateMainGitConfig(contexts);

      // Assert
      expect(mockFileSystem.readGitConfig).toHaveBeenCalled();
      expect(mockGitService.removeConditionalIncludes).toHaveBeenCalledWith(
        existingConfig
      );
      expect(mockGitService.generateConditionalIncludes).toHaveBeenCalledWith(
        contexts,
        mockFileSystem.gitConfigDirPath
      );
      expect(mockFileSystem.writeGitConfig).toHaveBeenCalledWith(
        existingConfig + "\n" + includesSection
      );
    });
  });
});
