/**
 * Tests for UserInterface display methods
 */
import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { UserInterface } from "../../lib/services/UserInterface.js";

// Mock chalk to prevent color output in tests
jest.mock("chalk", () => {
  const createColorMock = () => jest.fn((text) => text);

  const chalkMock = createColorMock();
  chalkMock.blue = createColorMock();
  chalkMock.green = createColorMock();
  chalkMock.red = createColorMock();
  chalkMock.yellow = createColorMock();
  chalkMock.cyan = createColorMock();
  chalkMock.magenta = createColorMock();
  chalkMock.white = createColorMock();
  chalkMock.dim = createColorMock();

  // Handle nested methods
  chalkMock.bold = createColorMock();
  chalkMock.bold.white = createColorMock();
  chalkMock.bold.white.bgHex = jest.fn(() => createColorMock());

  return chalkMock;
});

// Mock path since it's used in several methods
jest.mock("path", () => ({
  join: jest.fn((...args) => args.join("/")),
}));

// We don't need to mock the Context class for these display-only tests

describe("UserInterface Display Methods", () => {
  let ui;
  let mockAdapter;

  beforeEach(() => {
    // Create a mock adapter instead of using the real one
    mockAdapter = {
      log: jest.fn(),
      error: jest.fn(),
      prompt: jest.fn(), // We won't use this in display tests
    };

    // Create a UserInterface instance with our mock adapter
    ui = new UserInterface(mockAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic display methods", () => {
    test("displayHeader should display a formatted header", () => {
      ui.displayHeader("Test Header");

      expect(mockAdapter.log).toHaveBeenCalledTimes(3);
      expect(mockAdapter.log.mock.calls[0][0]).toContain("=");
      expect(mockAdapter.log.mock.calls[1][0]).toContain("Test Header");
      expect(mockAdapter.log.mock.calls[2][0]).toContain("=");
    });

    test("displaySuccess should display a success message", () => {
      ui.displaySuccess("Operation completed");

      expect(mockAdapter.log).toHaveBeenCalledTimes(1);
      expect(mockAdapter.log.mock.calls[0][0]).toContain("Operation completed");
    });

    test("displayError should display an error message", () => {
      ui.displayError("Something went wrong");

      expect(mockAdapter.error).toHaveBeenCalledTimes(1);
      expect(mockAdapter.error.mock.calls[0][0]).toContain(
        "Something went wrong"
      );
    });

    test("displayWarning should display a warning message", () => {
      ui.displayWarning("Be careful");

      expect(mockAdapter.log).toHaveBeenCalledTimes(1);
      expect(mockAdapter.log.mock.calls[0][0]).toContain("Be careful");
    });

    test("displaySetupInfo should display setup information", () => {
      ui.displaySetupInfo();

      expect(mockAdapter.log).toHaveBeenCalledTimes(4);
      expect(mockAdapter.log.mock.calls[0][0]).toContain(
        "Let's set up your Git contexts"
      );
    });
  });

  describe("Context display methods", () => {
    const mockContexts = [
      {
        name: "work",
        userName: "Work User",
        userEmail: "work@example.com",
        pathPattern: "~/work/**",
        pathPatterns: ["~/work/**"],
        autoSign: false,
      },
      {
        name: "personal",
        userName: "Personal User",
        userEmail: "personal@example.com",
        pathPattern: "~/personal/**",
        pathPatterns: ["~/personal/**"],
        signingKey: "ABC123",
        autoSign: true,
      },
    ];

    const mockConfigDir = "~/.gitconfig.d";

    test("displayContexts should display multiple contexts", () => {
      ui.displayContexts(mockContexts, mockConfigDir);
      expect(mockAdapter.log).toHaveBeenCalled();

      // Verify user details are displayed
      expect(
        mockAdapter.log.mock.calls.some(
          (call) =>
            call[0] &&
            typeof call[0] === "string" &&
            call[0].includes("User Name")
        )
      ).toBe(true);
      expect(
        mockAdapter.log.mock.calls.some(
          (call) =>
            call[0] &&
            typeof call[0] === "string" &&
            call[0].includes("User Email")
        )
      ).toBe(true);

      // Verify signing key is displayed for personal context
      expect(
        mockAdapter.log.mock.calls.some(
          (call) =>
            call[0] &&
            typeof call[0] === "string" &&
            call[0].includes("Signing Key")
        )
      ).toBe(true);
    });

    test("displayContexts should do nothing when no contexts are provided", () => {
      ui.displayContexts([], mockConfigDir);
      expect(mockAdapter.log).not.toHaveBeenCalled();

      ui.displayContexts(null, mockConfigDir);
      expect(mockAdapter.log).not.toHaveBeenCalled();
    });

    test("displayContextsList should display a simple list of contexts", () => {
      ui.displayContextsList(mockContexts, mockConfigDir);
      expect(mockAdapter.log).toHaveBeenCalled();

      // Verify context names are displayed
      expect(
        mockAdapter.log.mock.calls.some(
          (call) =>
            call[0] && typeof call[0] === "string" && call[0].includes("work")
        )
      ).toBe(true);
      expect(
        mockAdapter.log.mock.calls.some(
          (call) =>
            call[0] &&
            typeof call[0] === "string" &&
            call[0].includes("personal")
        )
      ).toBe(true);
    });

    test("displayContextsList should show warning when no contexts are available", () => {
      // Mock the displayWarning function to verify it's called
      const originalDisplayWarning = ui.displayWarning;
      ui.displayWarning = jest.fn();

      ui.displayContextsList([], mockConfigDir);
      expect(ui.displayWarning).toHaveBeenCalledWith(
        "No contexts configured yet. Run setup to configure contexts."
      );

      // Restore the original function
      ui.displayWarning = originalDisplayWarning;
    });

    test("displayActiveContext should display active context info", () => {
      const mockContext = {
        name: "work",
        userName: "Work User",
        userEmail: "work@example.com",
      };
      const activeConfig = "user.name=Work User\nuser.email=work@example.com";

      ui.displayActiveContext(mockContext, mockConfigDir, activeConfig);
      expect(mockAdapter.log).toHaveBeenCalled();
      expect(
        mockAdapter.log.mock.calls.some(
          (call) =>
            call[0] &&
            typeof call[0] === "string" &&
            call[0].includes("Current path matches context")
        )
      ).toBe(true);
    });

    test("displayActiveContext should show warning when no context matches", () => {
      // Mock the displayWarning function to verify it's called
      const originalDisplayWarning = ui.displayWarning;
      ui.displayWarning = jest.fn();

      ui.displayActiveContext(null, mockConfigDir, "default config");
      expect(ui.displayWarning).toHaveBeenCalledWith(
        "Current directory does not match any configured context."
      );

      // Restore the original function
      ui.displayWarning = originalDisplayWarning;
    });

    test("displayContextsWithUrlPatterns should display contexts with URL patterns", () => {
      const contextsWithUrls = [
        {
          name: "work",
          userName: "Work User",
          userEmail: "work@example.com",
          pathPatterns: ["~/work/**"],
          urlPatterns: ["github.com/acme-corp/*"],
        },
        {
          name: "personal",
          userName: "Personal User",
          userEmail: "personal@example.com",
          pathPatterns: ["~/personal/**"],
          urlPatterns: ["github.com/personal/*"],
          signingKey: "ABC123",
          autoSign: true,
        },
      ];

      ui.displayContextsWithUrlPatterns(contextsWithUrls, mockConfigDir);
      expect(mockAdapter.log).toHaveBeenCalled();

      // Verify URL patterns are displayed
      expect(
        mockAdapter.log.mock.calls.some(
          (call) =>
            call[0] &&
            typeof call[0] === "string" &&
            call[0].includes("URL Patterns")
        )
      ).toBe(true);

      // Verify instructions are displayed
      expect(
        mockAdapter.log.mock.calls.some(
          (call) =>
            call[0] &&
            typeof call[0] === "string" &&
            call[0].includes("git-context detect-url")
        )
      ).toBe(true);
    });

    test("displayContextsWithUrlPatterns should do nothing when no contexts are provided", () => {
      ui.displayContextsWithUrlPatterns([], mockConfigDir);
      expect(mockAdapter.log).not.toHaveBeenCalled();

      ui.displayContextsWithUrlPatterns(null, mockConfigDir);
      expect(mockAdapter.log).not.toHaveBeenCalled();
    });
  });

  describe("Template methods", () => {
    test("displayTemplates should display available templates", () => {
      const templates = [
        {
          name: "personal",
          description: "Personal GitHub projects",
          gitConfig: { "user.name": "", "user.email": "" },
          urlPatterns: ["github.com/*/personal-*"],
        },
        {
          name: "work",
          description: "Work projects",
          gitConfig: {
            "user.name": "",
            "user.email": "",
            "commit.gpgsign": "true",
          },
          urlPatterns: ["github.com/*/work-*"],
        },
      ];

      ui.displayTemplates(templates);
      expect(mockAdapter.log).toHaveBeenCalled();

      // Verify template names are displayed
      expect(
        mockAdapter.log.mock.calls.some(
          (call) =>
            call[0] &&
            typeof call[0] === "string" &&
            call[0].includes("personal")
        )
      ).toBe(true);
      expect(
        mockAdapter.log.mock.calls.some(
          (call) =>
            call[0] && typeof call[0] === "string" && call[0].includes("work")
        )
      ).toBe(true);
    });
  });
});
