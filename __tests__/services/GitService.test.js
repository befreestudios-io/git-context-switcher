/**
 * Tests for the GitService class
 */
import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterAll,
} from "@jest/globals";
import { GitService } from "../../lib/services/GitService.js";
import { mockSanitizeInput } from "../setup.js";
import {
  mockExec,
  mockFailedExec,
  mockGitInstalled,
  mockGitConfig,
  resetExecMocks,
} from "../utils/testUtils/execTestUtils.js";
import {
  setTestEnvironment,
  restoreEnvironment,
} from "../utils/testUtils/pathTestUtils.js";

// Set test environment
setTestEnvironment("test");

describe("GitService", () => {
  let gitService;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    mockSanitizeInput.mockClear();
    resetExecMocks();

    // Create a new instance of GitService with the mock exec function
    gitService = new GitService(mockExec);
  });

  afterAll(() => {
    restoreEnvironment();
  });

  describe("checkInstalled", () => {
    test("should return true when git is installed", async () => {
      // Mock exec to succeed when checking for git
      mockGitInstalled(true);

      const result = await gitService.checkInstalled();

      expect(result).toBe(true);
      expect(mockExec).toHaveBeenCalledWith("git --version");
    });

    test("should throw error when git is not installed", async () => {
      // Mock exec to fail when checking for git
      mockFailedExec("Command not found: git");

      await expect(gitService.checkInstalled()).rejects.toThrow(
        "Git is not installed"
      );
      expect(mockExec).toHaveBeenCalledWith("git --version");
    });
  });

  describe("getActiveConfig", () => {
    test("should execute git command to get config", async () => {
      // Mock exec to return config
      const testConfig = "user.name=Test\nuser.email=test@example.com";
      mockGitConfig(testConfig);

      const result = await gitService.getActiveConfig();

      expect(result).toBe(testConfig);
      expect(mockExec).toHaveBeenCalledWith("git config --list");
    });

    test("should throw error when git command fails", async () => {
      // Mock exec to fail
      mockFailedExec("Failed to get config");

      await expect(gitService.getActiveConfig()).rejects.toThrow(
        "Failed to get git configuration"
      );
      expect(mockExec).toHaveBeenCalledWith("git config --list");
    });
  });

  describe("removeConditionalIncludes", () => {
    test("should remove conditional include sections from config", () => {
      const configContent = `[user]
    name = Test User
    email = test@example.com
[includeIf "gitdir:/path/to/work/"]
    path = /path/to/work.gitconfig
[core]
    editor = vim`;

      const result = gitService.removeConditionalIncludes(configContent);

      expect(result).not.toContain("includeIf");
      expect(result).toContain("[user]");
      expect(result).toContain("[core]");
      expect(result).not.toContain("path = /path/to/work.gitconfig");
    });

    test("should handle empty input", () => {
      const result = gitService.removeConditionalIncludes("");

      expect(result).toBe("");
    });
  });

  describe("generateConditionalIncludes", () => {
    test("should generate include sections for contexts", () => {
      const contexts = [
        { name: "work", pathPattern: "/path/to/work/**" },
        { name: "personal", pathPattern: "/path/to/personal/**" },
      ];
      const basePath = "/path/to/configs";

      const result = gitService.generateConditionalIncludes(contexts, basePath);

      expect(result).toContain('[includeIf "gitdir:/path/to/work/**"]');
      expect(result).toContain('[includeIf "gitdir:/path/to/personal/**"]');
      expect(result).toContain("path = /path/to/configs/work.gitconfig");
      expect(result).toContain("path = /path/to/configs/personal.gitconfig");
    });

    test("should handle empty contexts array", () => {
      const result = gitService.generateConditionalIncludes(
        [],
        "/path/to/configs"
      );

      expect(result).toBe("");
    });

    test("should filter out invalid contexts", () => {
      const contexts = [
        { name: "valid", pathPattern: "/valid/path/**" },
        { name: "", pathPattern: "/invalid/path/**" }, // Invalid name
        { name: "invalid", pathPattern: "" }, // Invalid pattern
        { notAName: "invalid", pathPattern: "/invalid/path/**" }, // Missing name
      ];
      const basePath = "/path/to/configs";

      const result = gitService.generateConditionalIncludes(contexts, basePath);

      expect(result).toContain('[includeIf "gitdir:/valid/path/**"]');
      expect(result).not.toContain("/invalid/path/");
    });
  });

  describe("getRepositoryUrl", () => {
    test("should return repository URL when available", async () => {
      // Mock exec to return a repository URL
      mockExec.mockResolvedValueOnce({
        stdout:
          "https://github.com/befreestudios-io/git-context-switcher.git\n",
        stderr: "",
      });

      const result = await gitService.getRepositoryUrl();

      expect(result).toBe(
        "https://github.com/befreestudios-io/git-context-switcher.git"
      );
      expect(mockExec).toHaveBeenCalledWith(
        "git config --get remote.origin.url"
      );
    });

    test("should return null when repository URL is not available", async () => {
      // Mock exec to fail
      mockExec.mockRejectedValueOnce(new Error("No such remote"));

      const result = await gitService.getRepositoryUrl();

      expect(result).toBeNull();
    });

    test("should use specified remote name", async () => {
      // Mock exec to return a repository URL
      mockExec.mockResolvedValueOnce({
        stdout:
          "https://github.com/befreestudios-io/git-context-switcher.git\n",
        stderr: "",
      });

      await gitService.getRepositoryUrl("upstream");

      expect(mockExec).toHaveBeenCalledWith(
        "git config --get remote.upstream.url"
      );
    });
  });

  describe("detectContextFromUrl", () => {
    test("should match context based on exact URL pattern", () => {
      const contexts = [
        {
          name: "personal",
          urlPatterns: ["github.com/personal-user/*"],
        },
        {
          name: "work",
          urlPatterns: ["github.com/acme-corp/*"],
        },
      ];

      const repoUrl = "https://github.com/acme-corp/project.git";

      const matchedContext = gitService.detectContextFromUrl(contexts, repoUrl);

      expect(matchedContext).not.toBeNull();
      expect(matchedContext.name).toBe("work");
    });

    test("should match context based on wildcard URL pattern", () => {
      const contexts = [
        {
          name: "personal",
          urlPatterns: ["github.com/personal-user/*"],
        },
        {
          name: "work",
          urlPatterns: ["github.com/acme-*/*"],
        },
      ];

      const repoUrl = "https://github.com/acme-corp/project.git";

      const matchedContext = gitService.detectContextFromUrl(contexts, repoUrl);

      expect(matchedContext).not.toBeNull();
      expect(matchedContext.name).toBe("work");
    });

    test("should match context based on SSH URL format", () => {
      const contexts = [
        {
          name: "work",
          urlPatterns: ["github.com/acme-corp/*"],
        },
      ];

      const repoUrl = "git@github.com:acme-corp/project.git";

      const matchedContext = gitService.detectContextFromUrl(contexts, repoUrl);

      expect(matchedContext).not.toBeNull();
      expect(matchedContext.name).toBe("work");
    });

    test("should return null when no URL pattern matches", () => {
      const contexts = [
        {
          name: "personal",
          urlPatterns: ["github.com/personal-user/*"],
        },
        {
          name: "work",
          urlPatterns: ["github.com/acme-corp/*"],
        },
      ];

      const repoUrl = "https://github.com/other-org/project.git";

      const matchedContext = gitService.detectContextFromUrl(contexts, repoUrl);

      expect(matchedContext).toBeNull();
    });

    test("should return null for empty or invalid inputs", () => {
      expect(
        gitService.detectContextFromUrl(null, "https://github.com/repo.git")
      ).toBeNull();
      expect(
        gitService.detectContextFromUrl([], "https://github.com/repo.git")
      ).toBeNull();
      expect(
        gitService.detectContextFromUrl([{ name: "test" }], null)
      ).toBeNull();
      expect(
        gitService.detectContextFromUrl([{ name: "test" }], "")
      ).toBeNull();
    });

    test("should handle context without URL patterns", () => {
      const contexts = [
        {
          name: "no-url-patterns",
          pathPattern: "/path/**",
        },
      ];

      const repoUrl = "https://github.com/any/project.git";

      const matchedContext = gitService.detectContextFromUrl(contexts, repoUrl);

      expect(matchedContext).toBeNull();
    });
  });

  describe("_normalizeGitUrl", () => {
    test("should normalize HTTPS URL", () => {
      const url =
        "https://github.com/befreestudios-io/git-context-switcher.git";
      const normalized = gitService._normalizeGitUrl(url);

      expect(normalized).toBe(
        "github.com/befreestudios-io/git-context-switcher"
      );
    });

    test("should normalize SSH URL", () => {
      const url = "git@github.com:befreestudios-io/git-context-switcher.git";
      const normalized = gitService._normalizeGitUrl(url);

      expect(normalized).toBe(
        "github.com/befreestudios-io/git-context-switcher"
      );
    });

    test("should handle empty or null input", () => {
      expect(gitService._normalizeGitUrl("")).toBe("");
      expect(gitService._normalizeGitUrl(null)).toBe("");
    });
  });

  describe("_urlPatternToRegex", () => {
    test("should convert simple pattern to regex", () => {
      const pattern = "github.com/user/repo";
      const regex = gitService._urlPatternToRegex(pattern);

      expect(regex).toBeInstanceOf(RegExp);
      expect(regex.test("github.com/user/repo")).toBe(true);
      expect(regex.test("github.com/other/repo")).toBe(false);
    });

    test("should convert wildcard pattern to regex", () => {
      const pattern = "github.com/user/*";
      const regex = gitService._urlPatternToRegex(pattern);

      expect(regex).toBeInstanceOf(RegExp);
      expect(regex.test("github.com/user/repo1")).toBe(true);
      expect(regex.test("github.com/user/repo2")).toBe(true);
      expect(regex.test("github.com/other/repo")).toBe(false);
    });

    test("should handle empty or null input", () => {
      const emptyRegex = gitService._urlPatternToRegex("");
      expect(emptyRegex).toBeInstanceOf(RegExp);
      expect(emptyRegex.test("")).toBe(true);

      const nullRegex = gitService._urlPatternToRegex(null);
      expect(nullRegex).toBeInstanceOf(RegExp);
      expect(nullRegex.test("")).toBe(true);
    });
  });
});
