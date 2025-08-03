import { expect, vi } from "vitest";

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

/**
 * Test configuration constants
 */
export const TEST_CONFIG = {
  TIMEOUTS: {
    SHORT: 1000,
    MEDIUM: 5000,
    LONG: 10000,
  },
  RETRY_ATTEMPTS: 3,
  MOCK_DELAY: 100,
} as const;

/**
 * Enhanced test setup with additional mocks
 */
export function setupEnhancedTestEnvironment() {
  // Mock Prisma client
  vi.mock("@peas/database", () => ({
    prisma: {
      $queryRaw: vi.fn(),
      $executeRaw: vi.fn(),
      note: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      ingredient: {
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      status: {
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
    },
  }));

  // Mock WebSocket server
  /* istanbul ignore next -- @preserve */
  vi.mock("../services/websocket-server", () => ({
    WebSocketManager: vi.fn().mockImplementation(() => ({
      broadcast: vi.fn(),
      addClient: vi.fn(),
      removeClient: vi.fn(),
    })),
    initializeWebSocketServer: vi.fn().mockResolvedValue({
      broadcast: vi.fn(),
      addClient: vi.fn(),
      removeClient: vi.fn(),
    }),
  }));

  // Mock file system operations
  vi.mock("fs/promises", () => ({
    readFile: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    mkdir: vi.fn(),
    access: vi.fn(),
  }));

  // Mock path operations
  vi.mock("path", () => ({
    join: vi.fn((...args: string[]) => args.join("/")),
    resolve: vi.fn((...args: string[]) => args.join("/")),
    extname: vi.fn((path: string) => {
      const match = path.match(/\.[^.]*$/);
      return match ? match[0] : "";
    }),
    basename: vi.fn((path: string) => {
      const parts = path.split("/");
      return parts[parts.length - 1];
    }),
  }));

  // Mock crypto operations
  vi.mock("crypto", () => ({
    randomUUID: vi.fn(() => "test-uuid"),
    createHash: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn(() => "test-hash"),
    })),
  }));

  // Mock date operations
  /* istanbul ignore next -- @preserve */
  vi.mock("date-fns", () => ({
    format: vi.fn((date: Date) => date.toISOString()),
    parseISO: vi.fn((dateString: string) => new Date(dateString)),
    isValid: vi.fn(() => true),
  }));

  return {
    cleanup: () => {
      vi.restoreAllMocks();
    },
  };
}

/**
 * Test data generators
 */
export class TestDataGenerator {
  /**
   * Generate a random string of specified length
   */
  static randomString(length: number = 10): string {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate a random UUID
   */
  static randomUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Generate a random email
   */
  static randomEmail(): string {
    return `test-${this.randomString(8)}@example.com`;
  }

  /**
   * Generate a random date within a range
   */
  static randomDate(
    start: Date = new Date(2020, 0, 1),
    end: Date = new Date()
  ): Date {
    return new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime())
    );
  }

  /**
   * Generate test HTML content with specified ingredients and instructions
   */
  /* istanbul ignore next -- @preserve */
  static generateTestHtml(
    options: {
      title?: string;
      ingredients?: string[];
      instructions?: string[];
      includeStyles?: boolean;
      includeIcons?: boolean;
    } = {}
  ): string {
    const {
      title = "Test Recipe",
      ingredients = ["1 cup flour", "2 eggs", "1 cup milk"],
      instructions = ["Mix ingredients", "Bake at 350F", "Serve hot"],
      includeStyles = false,
      includeIcons = false,
    } = options;

    const styleSection = includeStyles
      ? `
        <style>
          body { font-family: Arial, sans-serif; }
          .ingredient { color: green; }
          .instruction { color: blue; }
        </style>
      `
      : "";

    const iconsSection = includeIcons
      ? `
        <icons>
          <svg width="16" height="16">
            <circle cx="8" cy="8" r="4" fill="red"/>
          </svg>
        </icons>
      `
      : "";

    const ingredientsHtml = ingredients
      .map((ingredient) => `<div class="para">${ingredient}</div>`)
      .join("\n");

    const instructionsHtml = instructions
      .map((instruction) => `<div class="para">${instruction}</div>`)
      .join("\n");

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          ${styleSection}
        </head>
        <body>
          <en-note class="peso" style="white-space: inherit">
            <meta itemprop="title" content="${title}" />
            <meta itemprop="created" content="20230101T000000Z" />
            ${iconsSection}
            <h1 class="noteTitle html-note">
              <b>${title}</b>
            </h1>
            <div class="para"><br /></div>
            ${ingredientsHtml}
            <div class="para"><br /></div>
            ${instructionsHtml}
          </en-note>
        </body>
      </html>
    `;
  }
}

/**
 * Test assertion helpers
 */
export class TestAssertions {
  /**
   * Assert that an object has all required properties
   */
  static assertHasProperties<T extends Record<string, unknown>>(
    obj: T,
    requiredProperties: (keyof T)[]
  ): void {
    for (const prop of requiredProperties) {
      expect(obj).toHaveProperty(prop as string);
    }
  }

  /**
   * Assert that a function throws an error with specific message
   */
  static async assertThrowsWithMessage(
    fn: () => Promise<unknown> | unknown,
    expectedMessage: string | RegExp
  ): Promise<void> {
    await expect(fn).rejects.toThrow(expectedMessage);
  }

  /**
   * Assert that a mock was called with specific arguments in order
   */
  static assertCalledInOrder(mock: unknown, expectedCalls: unknown[][]): void {
    expect(mock).toHaveBeenCalledTimes(expectedCalls.length);
    expectedCalls.forEach((expectedArgs, index) => {
      expect(mock).toHaveBeenNthCalledWith(index + 1, ...expectedArgs);
    });
  }

  /**
   * Assert that a date is within a reasonable range
   */
  /* istanbul ignore next -- @preserve */
  static assertRecentDate(date: Date, maxAgeMs: number = 60000): void {
    const now = new Date();
    const diff = Math.abs(now.getTime() - date.getTime());
    expect(diff).toBeLessThan(maxAgeMs);
  }
}
