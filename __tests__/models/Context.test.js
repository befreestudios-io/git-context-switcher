/**
 * Tests for the Context class
 */
import { describe, test, expect, jest } from "@jest/globals";
import { Context } from "../../lib/models/Context.js";

describe("Context", () => {
  describe("constructor", () => {
    test("should create a context with all properties", () => {
      const context = new Context(
        "work",
        "Work Context",
        ["~/work", "/projects/work"],
        {
          "user.name": "Work User",
          "user.email": "work@example.com",
        }
      );

      expect(context.name).toBe("work");
      expect(context.description).toBe("Work Context");
      expect(context.pathPatterns).toEqual(["~/work", "/projects/work"]);
      expect(context.gitConfig).toEqual({
        "user.name": "Work User",
        "user.email": "work@example.com",
      });
    });

    test("should create a context with only required properties", () => {
      const context = new Context("personal");

      expect(context.name).toBe("personal");
      expect(context.description).toBe("");
      expect(context.pathPatterns).toEqual([]);
      expect(context.gitConfig).toEqual({});
    });

    test("should create a context with default values for optional properties", () => {
      const context = new Context("home", "Home Projects");

      expect(context.name).toBe("home");
      expect(context.description).toBe("Home Projects");
      expect(context.pathPatterns).toEqual([]);
      expect(context.gitConfig).toEqual({});
    });
  });

  describe("validate", () => {
    test("should validate a valid context", () => {
      const context = new Context("work", "Work Context", ["~/work"], {
        "user.name": "Work User",
        "user.email": "work@example.com",
      });

      const { valid, errors } = context.validate();

      expect(valid).toBe(true);
      expect(errors.length).toBe(0);
    });

    test("should invalidate a context with no name", () => {
      const context = new Context("");

      const { valid, errors } = context.validate();

      expect(valid).toBe(false);
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain("name");
    });

    test("should invalidate a context with invalid name characters", () => {
      const context = new Context("work;rm -rf /");

      const { valid, errors } = context.validate();

      expect(valid).toBe(false);
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain("name");
    });

    test("should validate a context with minimum valid properties", () => {
      const context = new Context("minimal");

      const { valid, errors } = context.validate();

      expect(valid).toBe(true);
      expect(errors.length).toBe(0);
    });
  });

  describe("fromObject", () => {
    test("should create context from object with all properties", () => {
      const obj = {
        name: "work",
        description: "Work Context",
        pathPatterns: ["~/work", "/projects/work"],
        gitConfig: {
          "user.name": "Work User",
          "user.email": "work@example.com",
        },
      };

      const context = Context.fromObject(obj);

      expect(context).toBeInstanceOf(Context);
      expect(context.name).toBe("work");
      expect(context.description).toBe("Work Context");
      expect(context.pathPatterns).toEqual(["~/work", "/projects/work"]);
      expect(context.gitConfig).toEqual({
        "user.name": "Work User",
        "user.email": "work@example.com",
      });
    });

    test("should create context from object with only name", () => {
      const obj = { name: "minimal" };

      const context = Context.fromObject(obj);

      expect(context).toBeInstanceOf(Context);
      expect(context.name).toBe("minimal");
      expect(context.description).toBe("");
      expect(context.pathPatterns).toEqual([]);
      expect(context.gitConfig).toEqual({});
    });

    test("should handle null or undefined values", () => {
      const obj = { name: "test", description: null, pathPatterns: undefined };

      const context = Context.fromObject(obj);

      expect(context).toBeInstanceOf(Context);
      expect(context.name).toBe("test");
      expect(context.description).toBe("");
      expect(context.pathPatterns).toEqual([]);
    });

    test("should throw error for object without name property", () => {
      const obj = { description: "No Name" };

      expect(() => Context.fromObject(obj)).toThrow("Context requires a name");
    });
  });

  describe("toObject", () => {
    test("should convert context to plain object with all properties", () => {
      const context = new Context("work", "Work Context", ["~/work"], {
        "user.name": "Work User",
        "user.email": "work@example.com",
      });

      const obj = context.toObject();

      expect(obj).toEqual({
        name: "work",
        description: "Work Context",
        pathPatterns: ["~/work"],
        gitConfig: {
          "user.name": "Work User",
          "user.email": "work@example.com",
        },
        urlPatterns: [],
      });
    });

    test("should convert minimal context to plain object", () => {
      const context = new Context("minimal");

      const obj = context.toObject();

      expect(obj).toEqual({
        name: "minimal",
        description: "",
        pathPatterns: [],
        gitConfig: {},
        urlPatterns: [],
      });
    });
  });

  describe("URL patterns", () => {
    test("should create a context with URL patterns", () => {
      const context = new Context(
        "work",
        "Work Context",
        ["~/work"],
        {
          "user.name": "Work User",
          "user.email": "work@example.com",
        },
        ["github.com/acme-corp/*", "gitlab.com/acme/*"]
      );

      expect(context.name).toBe("work");
      expect(context.urlPatterns).toEqual([
        "github.com/acme-corp/*",
        "gitlab.com/acme/*",
      ]);
    });

    test("should validate context with valid URL patterns", () => {
      const context = new Context(
        "work",
        "Work Context",
        ["~/work"],
        {
          "user.name": "Work User",
          "user.email": "work@example.com",
        },
        ["github.com/acme-corp/*", "gitlab.com/acme/*"]
      );

      const { valid, errors } = context.validate();

      expect(valid).toBe(true);
      expect(errors.length).toBe(0);
    });

    test("should invalidate context with invalid URL patterns", () => {
      const context = new Context(
        "work",
        "Work Context",
        ["~/work"],
        {
          "user.name": "Work User",
          "user.email": "work@example.com",
        },
        ["github.com/acme-corp/<script>"]
      );

      const { valid, errors } = context.validate();

      expect(valid).toBe(false);
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain("URL pattern");
    });

    test("should include URL patterns in toObject output", () => {
      const context = new Context(
        "work",
        "Work Context",
        ["~/work"],
        {
          "user.name": "Work User",
          "user.email": "work@example.com",
        },
        ["github.com/acme-corp/*"]
      );

      const obj = context.toObject();

      expect(obj).toEqual({
        name: "work",
        description: "Work Context",
        pathPatterns: ["~/work"],
        gitConfig: {
          "user.name": "Work User",
          "user.email": "work@example.com",
        },
        urlPatterns: ["github.com/acme-corp/*"],
      });
    });

    test("should create context from object with URL patterns", () => {
      const obj = {
        name: "work",
        description: "Work Context",
        pathPatterns: ["~/work"],
        gitConfig: {
          "user.name": "Work User",
          "user.email": "work@example.com",
        },
        urlPatterns: ["github.com/acme-corp/*", "gitlab.com/acme/*"],
      };

      const context = Context.fromObject(obj);

      expect(context).toBeInstanceOf(Context);
      expect(context.urlPatterns).toEqual([
        "github.com/acme-corp/*",
        "gitlab.com/acme/*",
      ]);
    });
  });

  describe("fromTemplate", () => {
    test("should create context from a template", () => {
      // Mock the getTemplates method to return a fixed set of templates
      const originalGetTemplates = Context.getTemplates;
      Context.getTemplates = jest.fn().mockReturnValue([
        {
          name: "test-template",
          description: "Test Template",
          gitConfig: {
            "user.name": "",
            "user.email": "",
            "commit.gpgsign": "true",
          },
          urlPatterns: ["github.com/test/*"],
        },
      ]);

      const context = Context.fromTemplate("test-context", "test-template");

      expect(context).toBeInstanceOf(Context);
      expect(context.name).toBe("test-context");
      expect(context.description).toBe("Test Template");
      expect(context.pathPatterns).toEqual([]);
      expect(context.gitConfig).toEqual({
        "user.name": "",
        "user.email": "",
        "commit.gpgsign": "true",
      });
      expect(context.urlPatterns).toEqual(["github.com/test/*"]);

      // Restore the original method
      Context.getTemplates = originalGetTemplates;
    });

    test("should throw error for non-existent template", () => {
      expect(() => Context.fromTemplate("test", "non-existent")).toThrow(
        'Template "non-existent" not found'
      );
    });
  });

  describe("getTemplates", () => {
    test("should return an array of template objects", () => {
      const templates = Context.getTemplates();

      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);

      // Check structure of first template
      const firstTemplate = templates[0];
      expect(firstTemplate).toHaveProperty("name");
      expect(firstTemplate).toHaveProperty("description");
      expect(firstTemplate).toHaveProperty("gitConfig");
      expect(firstTemplate).toHaveProperty("urlPatterns");
    });
  });
});
