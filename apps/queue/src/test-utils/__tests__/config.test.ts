import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  TEST_CONFIG,
  TestAssertions,
  TestDataGenerator,
  setupEnhancedTestEnvironment,
} from "../config";

describe("config", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("TEST_CONFIG", () => {
    it("should have expected configuration values", () => {
      expect(TEST_CONFIG.TIMEOUTS.SHORT).toBe(1000);
      expect(TEST_CONFIG.TIMEOUTS.MEDIUM).toBe(5000);
      expect(TEST_CONFIG.TIMEOUTS.LONG).toBe(10000);
      expect(TEST_CONFIG.RETRY_ATTEMPTS).toBe(3);
      expect(TEST_CONFIG.MOCK_DELAY).toBe(100);
    });
  });

  describe("setupEnhancedTestEnvironment", () => {
    it("should set up enhanced test environment with Prisma mocking", () => {
      const { cleanup } = setupEnhancedTestEnvironment();

      expect(process.env.NODE_ENV).toBe("test");
      // Note: DATABASE_URL and REDIS_URL are not set by this function
      // They are set by the actual environment

      cleanup();
    });

    it("should restore mocks on cleanup", () => {
      const { cleanup } = setupEnhancedTestEnvironment();

      // Verify environment is set
      expect(process.env.NODE_ENV).toBe("test");

      cleanup();

      // Verify mocks are restored
      expect(vi.isMockFunction(console.log)).toBe(false);
    });
  });

  describe("TestDataGenerator", () => {
    it("should generate random strings", () => {
      const str1 = TestDataGenerator.randomString(10);
      const str2 = TestDataGenerator.randomString(10);

      expect(str1).toHaveLength(10);
      expect(str2).toHaveLength(10);
      expect(str1).not.toBe(str2);
    });

    it("should generate random UUIDs", () => {
      const uuid1 = TestDataGenerator.randomUUID();
      const uuid2 = TestDataGenerator.randomUUID();
      // UUID v4 regex
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid1).toMatch(uuidRegex);
      expect(uuid2).toMatch(uuidRegex);
      expect(uuid1).not.toBe(uuid2);
    });

    it("should generate random emails", () => {
      const email1 = TestDataGenerator.randomEmail();
      const email2 = TestDataGenerator.randomEmail();
      expect(email1).toMatch(/^test-[a-zA-Z0-9]+@example.com$/);
      expect(email2).toMatch(/^test-[a-zA-Z0-9]+@example.com$/);
      expect(email1).not.toBe(email2);
    });

    it("should generate random dates within a custom range", () => {
      const start = new Date(2022, 0, 1);
      const end = new Date(2022, 11, 31);
      const date = TestDataGenerator.randomDate(start, end);
      expect(date.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(date.getTime()).toBeLessThanOrEqual(end.getTime());
    });

    it("should generate HTML content", () => {
      const html = TestDataGenerator.generateTestHtml({ title: "Test Recipe" });

      expect(html).toContain("Test Recipe");
      expect(html).toContain("<html>");
      expect(html).toContain("en-note");
    });

    it("should generate HTML content with custom ingredients", () => {
      const ingredients = ["flour", "eggs", "milk"];
      const html = TestDataGenerator.generateTestHtml({
        title: "Custom Recipe",
        ingredients,
      });

      expect(html).toContain("Custom Recipe");
      ingredients.forEach((ingredient) => {
        expect(html).toContain(ingredient);
      });
    });

    it("should generate HTML content with custom instructions", () => {
      const instructions = ["Step 1", "Step 2", "Step 3"];
      const html = TestDataGenerator.generateTestHtml({
        title: "Instructions Recipe",
        instructions,
      });
      instructions.forEach((instruction) => {
        expect(html).toContain(instruction);
      });
    });

    it("should include styles when includeStyles is true", () => {
      const html = TestDataGenerator.generateTestHtml({ includeStyles: true });
      expect(html).toContain("<style>");
      expect(html).toContain(".ingredient");
    });

    it("should include icons when includeIcons is true", () => {
      const html = TestDataGenerator.generateTestHtml({ includeIcons: true });
      expect(html).toContain("<svg");
      expect(html).toContain("<circle");
    });
  });

  describe("TestAssertions", () => {
    it("should assert recent date", () => {
      const date = new Date();

      TestAssertions.assertRecentDate(date, 60000);
    });

    it("should throw error for old date", () => {
      const oldDate = new Date(Date.now() - 120000); // 2 minutes ago

      expect(() => {
        TestAssertions.assertRecentDate(oldDate, 60000);
      }).toThrow();
    });

    it("should assert object has properties", () => {
      const obj = { name: "test", value: 123 };

      TestAssertions.assertHasProperties(obj, ["name", "value"]);
    });

    it("should throw error for missing properties", () => {
      const obj = { name: "test" };

      expect(() => {
        TestAssertions.assertHasProperties(obj, [
          "name",
          "missing" as keyof typeof obj,
        ]);
      }).toThrow();
    });

    it("should assert function throws with message", async () => {
      const asyncFn = async () => {
        throw new Error("Test error");
      };

      await TestAssertions.assertThrowsWithMessage(asyncFn, "Test error");
    });

    it("should assert function throws with message (sync)", () => {
      const syncFn = () => {
        throw new Error("Sync error");
      };

      expect(() => syncFn()).toThrow("Sync error");
    });

    it("should assert mocks were called in order", () => {
      const mock = vi.fn();

      mock(1, 2);
      mock(3, 4);

      TestAssertions.assertCalledInOrder(mock, [
        [1, 2],
        [3, 4],
      ]);
    });

    it("should throw error for wrong call order", () => {
      const mock = vi.fn();

      mock(3, 4);
      mock(1, 2);

      expect(() => {
        TestAssertions.assertCalledInOrder(mock, [
          [1, 2],
          [3, 4],
        ]);
      }).toThrow();
    });
  });
});
