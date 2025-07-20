import { describe, it, expect, vi, beforeEach } from "vitest";
import { getHtmlFiles } from "../../utils";

// Mock fs module
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  constants: {
    R_OK: 4,
  },
  promises: {
    access: vi.fn(),
    readdir: vi.fn(),
  },
}));

describe("getHtmlFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return HTML files from directory", async () => {
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.promises.access).mockResolvedValue(undefined);

    vi.mocked(fs.promises.readdir).mockResolvedValue([
      "file1.html",
      "file2.html",
      "file3.txt",
      "file4.json",
    ] as unknown as import("fs").Dirent<Buffer>[]);

    const result = await getHtmlFiles("/path/to/directory");

    expect(result).toEqual(["file1.html", "file2.html"]);
  });

  it("should exclude specified files", async () => {
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.promises.access).mockResolvedValue(undefined);

    vi.mocked(fs.promises.readdir).mockResolvedValue([
      "file1.html",
      "file2.html",
      "file3.html",
      "index.html",
    ] as unknown as import("fs").Dirent<Buffer>[]);

    const result = await getHtmlFiles("/path/to/directory", ["index.html"]);

    expect(result).toEqual(["file1.html", "file2.html", "file3.html"]);
  });

  it("should throw error when directory does not exist", async () => {
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(false);

    await expect(getHtmlFiles("/nonexistent/directory")).rejects.toThrow(
      "Directory does not exist: /nonexistent/directory"
    );
  });

  it("should throw error when directory is not readable", async () => {
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.promises.access).mockRejectedValue(
      new Error("Permission denied")
    );

    await expect(getHtmlFiles("/path/to/directory")).rejects.toThrow(
      "Cannot read directory: /path/to/directory"
    );
  });

  it("should return empty array when no HTML files exist", async () => {
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.promises.access).mockResolvedValue(undefined);

    vi.mocked(fs.promises.readdir).mockResolvedValue([
      "file1.txt",
      "file2.json",
      "file3.xml",
    ] as unknown as import("fs").Dirent<Buffer>[]);

    const result = await getHtmlFiles("/path/to/directory");

    expect(result).toEqual([]);
  });

  it("should handle mixed file types", async () => {
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.promises.access).mockResolvedValue(undefined);

    vi.mocked(fs.promises.readdir).mockResolvedValue([
      "index.html",
      "about.html",
      "contact.html",
      "styles.css",
      "script.js",
      "image.jpg",
      "data.json",
    ] as unknown as import("fs").Dirent<Buffer>[]);

    const result = await getHtmlFiles("/path/to/directory");

    expect(result).toEqual(["index.html", "about.html", "contact.html"]);
  });

  it("should handle files with different HTML extensions", async () => {
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.promises.access).mockResolvedValue(undefined);

    vi.mocked(fs.promises.readdir).mockResolvedValue([
      "file1.html",
      "file2.HTML",
      "file3.Html",
      "file4.htm",
      "file5.HTM",
    ] as unknown as import("fs").Dirent<Buffer>[]);

    const result = await getHtmlFiles("/path/to/directory");

    expect(result).toEqual(["file1.html"]);
  });

  it("should handle empty directory", async () => {
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.promises.access).mockResolvedValue(undefined);
    vi.mocked(fs.promises.readdir).mockResolvedValue(
      [] as unknown as import("fs").Dirent<Buffer>[]
    );

    const result = await getHtmlFiles("/path/to/directory");

    expect(result).toEqual([]);
  });

  it("should handle directory with only excluded files", async () => {
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.promises.access).mockResolvedValue(undefined);

    vi.mocked(fs.promises.readdir).mockResolvedValue([
      "index.html",
      "about.html",
    ] as unknown as import("fs").Dirent<Buffer>[]);

    const result = await getHtmlFiles("/path/to/directory", [
      "index.html",
      "about.html",
    ]);

    expect(result).toEqual([]);
  });
});
