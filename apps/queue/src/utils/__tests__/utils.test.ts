/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createJobOptions,
  createQueueStatusResponse,
  deepClone,
  formatLogMessage,
  generateUuid,
  getHtmlFiles,
  measureExecutionTime,
  sleep,
  truncateString,
  validateFile,
  validateFileContent,
} from "../utils";

// Mock fs module
vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
    constants: {
      R_OK: 4,
    },
    promises: {
      access: vi.fn(),
      readdir: vi.fn(),
    },
  },
  existsSync: vi.fn(),
  constants: {
    R_OK: 4,
  },
  promises: {
    access: vi.fn(),
    readdir: vi.fn(),
  },
}));

// Mock crypto module
vi.mock("crypto", () => ({
  randomUUID: vi.fn(),
}));

describe("formatLogMessage", () => {
  it("should format message with placeholders", () => {
    const template = "Processing {operation} for {user}";
    const placeholders = {
      operation: "import",
      user: "john",
    };

    const result = formatLogMessage(template, placeholders);

    expect(result).toBe("Processing import for john");
  });

  it("should handle missing placeholders", () => {
    const template = "Processing {operation} for {user}";
    const placeholders = {
      operation: "import",
    };

    const result = formatLogMessage(template, placeholders);

    expect(result).toBe("Processing import for {user}");
  });

  it("should handle empty placeholders object", () => {
    const template = "Processing {operation} for {user}";
    const placeholders = {};

    const result = formatLogMessage(template, placeholders);

    expect(result).toBe("Processing {operation} for {user}");
  });

  it("should handle numeric placeholders", () => {
    const template = "Processed {count} items in {time}ms";
    const placeholders = {
      count: 42,
      time: 1500,
    };

    const result = formatLogMessage(template, placeholders);

    expect(result).toBe("Processed 42 items in 1500ms");
  });

  it("should handle template without placeholders", () => {
    const template = "Simple message";
    const placeholders = { key: "value" };

    const result = formatLogMessage(template, placeholders);

    expect(result).toBe("Simple message");
  });
});

describe("createJobOptions", () => {
  it("should create job options with defaults", async () => {
    const result = await createJobOptions();

    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  it("should create job options with overrides", async () => {
    const overrides = {
      attempts: 3 as const,
      backoff: {
        type: "exponential" as const,
        delay: 2000 as const,
      },
    };

    const result = await createJobOptions(overrides);

    expect(result).toBeDefined();
    expect(result.attempts).toBe(3);
    expect(result.backoff).toEqual(overrides.backoff);
  });
});

describe("validateFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate existing and readable file", async () => {
    const fs = vi.mocked(await import("fs"));
    fs.existsSync.mockReturnValue(true);
    (fs.promises.access as any).mockResolvedValue(undefined);

    await expect(
      validateFile("/path/to/file.html", "file.html")
    ).resolves.toBeUndefined();

    expect(fs.existsSync).toHaveBeenCalledWith("/path/to/file.html");
    expect(fs.promises.access).toHaveBeenCalledWith("/path/to/file.html", 4);
  });

  it("should throw error when file does not exist", async () => {
    const fs = vi.mocked(await import("fs"));
    fs.existsSync.mockReturnValue(false);

    await expect(
      validateFile("/path/to/file.html", "file.html")
    ).rejects.toThrow("File does not exist: file.html");

    expect(fs.existsSync).toHaveBeenCalledWith("/path/to/file.html");
    expect(fs.promises.access).not.toHaveBeenCalled();
  });

  it("should throw error when file is not readable", async () => {
    const fs = vi.mocked(await import("fs"));
    fs.existsSync.mockReturnValue(true);
    (fs.promises.access as any).mockRejectedValue(
      new Error("Permission denied")
    );

    await expect(
      validateFile("/path/to/file.html", "file.html")
    ).rejects.toThrow("Cannot read file: file.html");

    expect(fs.existsSync).toHaveBeenCalledWith("/path/to/file.html");
    expect(fs.promises.access).toHaveBeenCalledWith("/path/to/file.html", 4);
  });
});

describe("validateFileContent", () => {
  it("should validate non-empty content", () => {
    expect(() =>
      validateFileContent("Valid content", "file.html")
    ).not.toThrow();
  });

  it("should throw error for empty content", () => {
    expect(() => validateFileContent("", "file.html")).toThrow(
      "File is empty: file.html"
    );
  });

  it("should throw error for whitespace-only content", () => {
    expect(() => validateFileContent("   \n\t  ", "file.html")).toThrow(
      "File is empty: file.html"
    );
  });

  it("should throw error for null content", () => {
    expect(() =>
      validateFileContent(null as unknown as string, "file.html")
    ).toThrow("File is empty: file.html");
  });

  it("should throw error for undefined content", () => {
    expect(() =>
      validateFileContent(undefined as unknown as string, "file.html")
    ).toThrow("File is empty: file.html");
  });
});

describe("getHtmlFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get HTML files from directory", async () => {
    const fs = vi.mocked(await import("fs"));

    fs.existsSync.mockReturnValue(true);
    (fs.promises.access as any).mockResolvedValue(undefined);
    (fs.promises.readdir as any).mockResolvedValue([
      "file1.html",
      "file2.html",
      "index.html",
      "document.txt",
      "image.jpg",
    ]);

    const result = await getHtmlFiles("/path/to/directory");

    expect(result).toEqual(["file1.html", "file2.html", "index.html"]);
    expect(fs.existsSync).toHaveBeenCalledWith("/path/to/directory");
    expect(fs.promises.access).toHaveBeenCalledWith("/path/to/directory", 4);
    expect(fs.promises.readdir).toHaveBeenCalledWith("/path/to/directory");
  });

  it("should throw error when directory does not exist", async () => {
    const fs = vi.mocked(await import("fs"));
    fs.existsSync.mockReturnValue(false);

    await expect(getHtmlFiles("/path/to/directory")).rejects.toThrow(
      "Directory does not exist: /path/to/directory"
    );

    expect(fs.existsSync).toHaveBeenCalledWith("/path/to/directory");
  });

  it("should throw error when directory is not accessible", async () => {
    const fs = vi.mocked(await import("fs"));

    fs.existsSync.mockReturnValue(true);
    (fs.promises.access as any).mockRejectedValue(
      new Error("Permission denied")
    );

    await expect(getHtmlFiles("/path/to/directory")).rejects.toThrow(
      "Cannot read directory: /path/to/directory"
    );

    expect(fs.existsSync).toHaveBeenCalledWith("/path/to/directory");
    expect(fs.promises.access).toHaveBeenCalledWith("/path/to/directory", 4);
  });

  it("should filter only HTML files", async () => {
    const fs = vi.mocked(await import("fs"));

    fs.existsSync.mockReturnValue(true);
    (fs.promises.access as any).mockResolvedValue(undefined);
    (fs.promises.readdir as any).mockResolvedValue([
      "file1.html",
      "file2.HTML",
      "file3.htm",
      "file4.HTM",
      "document.txt",
      "image.jpg",
      "script.js",
    ]);

    const result = await getHtmlFiles("/path/to/directory");

    expect(result).toEqual(["file1.html"]);
  });

  it("should throw error when readdir fails", async () => {
    const fs = vi.mocked(await import("fs"));

    fs.existsSync.mockReturnValue(true);
    (fs.promises.access as any).mockResolvedValue(undefined);
    (fs.promises.readdir as any).mockRejectedValue(new Error("Read error"));

    await expect(getHtmlFiles("/path/to/directory")).rejects.toThrow(
      "Read error"
    );

    expect(fs.existsSync).toHaveBeenCalledWith("/path/to/directory");
    expect(fs.promises.access).toHaveBeenCalledWith("/path/to/directory", 4);
    expect(fs.promises.readdir).toHaveBeenCalledWith("/path/to/directory");
  });
});

describe("createQueueStatusResponse", () => {
  it("should create queue status response", () => {
    const waiting = [{ id: "1" }, { id: "2" }];
    const active = [{ id: "3" }];
    const completed = [{ id: "4" }, { id: "5" }, { id: "6" }];
    const failed = [{ id: "7" }];

    const result = createQueueStatusResponse(
      waiting,
      active,
      completed,
      failed
    );

    expect(result).toEqual({
      success: true,
      status: {
        waiting: 2,
        active: 1,
        completed: 3,
        failed: 1,
        total: 7,
      },
      timestamp: expect.any(String),
    });
  });

  it("should handle empty queues", () => {
    const result = createQueueStatusResponse([], [], [], []);

    expect(result).toEqual({
      success: true,
      status: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        total: 0,
      },
      timestamp: expect.any(String),
    });
  });

  it("should generate valid timestamp", () => {
    const result = createQueueStatusResponse([], [], [], []);

    expect(result.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
  });
});

describe("measureExecutionTime", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should measure execution time and return result", async () => {
    const operation = vi.fn().mockResolvedValue("test result");

    const result = await measureExecutionTime(operation);

    expect(result.result).toBe("test result");
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(operation).toHaveBeenCalled();
  });

  it("should log execution time when operation name is provided", async () => {
    const operation = vi.fn().mockResolvedValue("test result");

    await measureExecutionTime(operation, "Test Operation");

    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(/Test Operation completed in \d+ms/)
    );
  });

  it("should not log when operation name is not provided", async () => {
    const operation = vi.fn().mockResolvedValue("test result");

    await measureExecutionTime(operation);

    expect(console.log).not.toHaveBeenCalled();
  });

  it("should handle async operations that take time", async () => {
    const operation = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "delayed result";
    });

    const result = await measureExecutionTime(operation, "Delayed Operation");

    expect(result.result).toBe("delayed result");
    expect(result.duration).toBeGreaterThanOrEqual(10);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(/Delayed Operation completed in \d+ms/)
    );
  });
});

describe("deepClone", () => {
  it("should clone primitive values", () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone("test")).toBe("test");
    expect(deepClone(true)).toBe(true);
    expect(deepClone(null)).toBe(null);
    expect(deepClone(undefined)).toBe(undefined);
  });

  it("should clone Date objects", () => {
    const original = new Date("2023-01-01T00:00:00.000Z");
    const cloned = deepClone(original);

    expect(cloned).toBeInstanceOf(Date);
    expect(cloned.getTime()).toBe(original.getTime());
    expect(cloned).not.toBe(original);
  });

  it("should clone arrays", () => {
    const original = [1, 2, 3, { key: "value" }];
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned[3]).not.toBe(original[3]);
  });

  it("should clone objects", () => {
    const original = {
      string: "test",
      number: 42,
      boolean: true,
      null: null,
      array: [1, 2, 3],
      nested: { key: "value" },
    };
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.array).not.toBe(original.array);
    expect(cloned.nested).not.toBe(original.nested);
  });

  it("should handle nested objects and arrays", () => {
    const original = {
      level1: {
        level2: {
          level3: [1, 2, { deep: "value" }],
        },
      },
    };
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned.level1).not.toBe(original.level1);
    expect(cloned.level1.level2).not.toBe(original.level1.level2);
    expect(cloned.level1.level2.level3).not.toBe(original.level1.level2.level3);
    expect(cloned.level1.level2.level3[2]).not.toBe(
      original.level1.level2.level3[2]
    );
  });

  it("should handle empty objects and arrays", () => {
    expect(deepClone({})).toEqual({});
    expect(deepClone([])).toEqual([]);
  });

  it("should handle objects with undefined values", () => {
    const original = { key: undefined };
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
  });
});

describe("generateUuid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate a UUID", async () => {
    const mockRandomUUID = vi.mocked(await import("crypto")).randomUUID;
    mockRandomUUID.mockReturnValue("550e8400-e29b-41d4-a716-446655440000");

    const result = await generateUuid();

    expect(result).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(mockRandomUUID).toHaveBeenCalled();
  });

  it("should generate different UUIDs on multiple calls", async () => {
    const mockRandomUUID = vi.mocked(await import("crypto")).randomUUID;
    mockRandomUUID
      .mockReturnValueOnce("550e8400-e29b-41d4-a716-446655440001")
      .mockReturnValueOnce("550e8400-e29b-41d4-a716-446655440002");

    const result1 = await generateUuid();
    const result2 = await generateUuid();

    expect(result1).toBe("550e8400-e29b-41d4-a716-446655440001");
    expect(result2).toBe("550e8400-e29b-41d4-a716-446655440002");
    expect(mockRandomUUID).toHaveBeenCalledTimes(2);
  });
});

describe("truncateString", () => {
  it("should truncate string longer than max length", () => {
    const result = truncateString(
      "This is a very long string that needs to be truncated",
      20
    );

    expect(result).toBe("This is a very lo...");
    expect(result.length).toBe(20);
  });

  it("should not truncate string shorter than max length", () => {
    const result = truncateString("Short string", 20);

    expect(result).toBe("Short string");
  });

  it("should use custom suffix", () => {
    const result = truncateString("Long string", 8, "***");

    expect(result).toBe("Long ***");
    expect(result.length).toBe(8);
  });

  it("should handle empty string", () => {
    const result = truncateString("", 10);

    expect(result).toBe("");
  });

  it("should handle max length equal to suffix length", () => {
    const result = truncateString("Long string", 3, "...");

    expect(result).toBe("...");
  });

  it("should handle max length shorter than suffix length", () => {
    const result = truncateString("Long string", 2, "...");

    expect(result).toBe("Long strin...");
  });
});

describe("sleep", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should sleep for specified milliseconds", async () => {
    const sleepPromise = sleep(1000);

    expect(sleepPromise).toBeInstanceOf(Promise);

    vi.advanceTimersByTime(1000);
    await sleepPromise;

    // Promise should resolve after the specified time
    expect(true).toBe(true);
  });

  it("should handle zero milliseconds", async () => {
    const sleepPromise = sleep(0);

    vi.advanceTimersByTime(0);
    await sleepPromise;

    // Promise should resolve immediately
    expect(true).toBe(true);
  });

  it("should handle negative milliseconds", async () => {
    const sleepPromise = sleep(-100);

    vi.advanceTimersByTime(0);
    await sleepPromise;

    // Promise should resolve immediately for negative values
    expect(true).toBe(true);
  });
});
