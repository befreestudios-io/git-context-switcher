/**
 * Snapshot tests for UserInterface
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
import { Context } from "../../lib/models/Context.js";

describe("UserInterface Snapshots", () => {
  let ui;
  let mockConsole;
  let contexts;

  beforeEach(() => {
    // Mock console methods
    mockConsole = {
      log: jest.fn(),
      error: jest.fn(),
    };
    console.log = mockConsole.log;
    console.error = mockConsole.error;

    // Create UI instance with a mock adapter
    const mockAdapter = {
      log: (...args) => mockConsole.log(...args),
      error: (...args) => mockConsole.error(...args),
      prompt: jest.fn().mockResolvedValue({}),
    };
    ui = new UserInterface(mockAdapter);

    // Create test contexts
    contexts = [
      new Context(
        "work",
        "Work context",
        ["~/work/**"],
        { "user.name": "Work User", "user.email": "work@example.com" },
        ["github.com/work/*"]
      ),
      new Context(
        "personal",
        "Personal context",
        ["~/personal/**"],
        {
          "user.name": "Personal User",
          "user.email": "personal@example.com",
          "user.signingkey": "ABC123",
          "commit.gpgsign": "true",
        },
        ["github.com/personal/*"]
      ),
    ];
  });

  afterEach(() => {
    // Restore console methods
    jest.restoreAllMocks();
  });

  test("displayContexts output snapshot", () => {
    // Arrange
    const configDir = "~/.gitconfig.d";

    // Act
    ui.displayContexts(contexts, configDir);

    // Assert
    const output = mockConsole.log.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toMatchSnapshot();
  });

  test("displayActiveContext output snapshot", () => {
    // Arrange
    const configDir = "~/.gitconfig.d";
    const activeConfig = "user.name=Work User\nuser.email=work@example.com";

    // Act
    ui.displayActiveContext(contexts[0], configDir, activeConfig);

    // Assert
    const output = mockConsole.log.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toMatchSnapshot();
  });

  test("displayTemplates output snapshot", () => {
    // Arrange
    const templates = [
      {
        name: "work",
        description: "Work template",
        gitConfig: { "user.name": "", "user.email": "" },
        urlPatterns: ["github.com/work/*"],
      },
      {
        name: "personal",
        description: "Personal template",
        gitConfig: {
          "user.name": "",
          "user.email": "",
          "commit.gpgsign": "true",
        },
        urlPatterns: ["github.com/personal/*"],
      },
    ];

    // Act
    ui.displayTemplates(templates);

    // Assert
    const output = mockConsole.log.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toMatchSnapshot();
  });

  test("displayContextsList output snapshot", () => {
    // Arrange
    const configDir = "~/.gitconfig.d";

    // Act
    ui.displayContextsList(contexts, configDir);

    // Assert
    const output = mockConsole.log.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toMatchSnapshot();
  });

  test("displayContextsWithUrlPatterns output snapshot", () => {
    // Arrange
    const configDir = "~/.gitconfig.d";

    // Act
    ui.displayContextsWithUrlPatterns(contexts, configDir);

    // Assert
    const output = mockConsole.log.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toMatchSnapshot();
  });

  test("displayHeader output snapshot", () => {
    // Act
    ui.displayHeader("Test Header");

    // Assert
    const output = mockConsole.log.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toMatchSnapshot();
  });

  test("displaySuccess output snapshot", () => {
    // Act
    ui.displaySuccess("Operation completed successfully");

    // Assert
    const output = mockConsole.log.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toMatchSnapshot();
  });

  test("displayError output snapshot", () => {
    // Act
    ui.displayError("Something went wrong");

    // Assert
    const output = mockConsole.error.mock.calls
      .map((call) => call[0])
      .join("\n");
    expect(output).toMatchSnapshot();
  });

  test("displayWarning output snapshot", () => {
    // Act
    ui.displayWarning("This is a warning");

    // Assert
    const output = mockConsole.log.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toMatchSnapshot();
  });

  test("displaySetupInfo output snapshot", () => {
    // Act
    ui.displaySetupInfo();

    // Assert
    const output = mockConsole.log.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toMatchSnapshot();
  });
});
