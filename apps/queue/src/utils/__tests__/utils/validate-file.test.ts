import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateFile } from "../../utils";

// Mock fs module
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  constants: {
    R_OK: 4,
  },
  promises: {
    access: vi.fn(),
  },
}));

describe("validateFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should pass validation for existing readable file", async () => {
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.promises.access).mockResolvedValue(undefined);

    await expect(
      validateFile("/path/to/file.html", "file.html")
    ).resolves.not.toThrow();
  });

  it("should throw error when file does not exist", async () => {
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(false);

    await expect(
      validateFile("/path/to/nonexistent.html", "nonexistent.html")
    ).rejects.toThrow("File does not exist: nonexistent.html");
  });

  it("should throw error when file is not readable", async () => {
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.promises.access).mockRejectedValue(
      new Error("Permission denied")
    );

    await expect(
      validateFile("/path/to/file.html", "file.html")
    ).rejects.toThrow("Cannot read file: file.html");
  });

  it("should throw error when directory does not exist", async () => {
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(false);

    await expect(
      validateFile("/nonexistent/path/file.html", "file.html")
    ).rejects.toThrow("File does not exist: file.html");
  });

  it("should handle access error with custom message", async () => {
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.promises.access).mockRejectedValue(new Error("ENOENT"));

    await expect(
      validateFile("/path/to/file.html", "file.html")
    ).rejects.toThrow("Cannot read file: file.html");
  });

  it("should validate file with different extensions", async () => {
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.promises.access).mockResolvedValue(undefined);

    await expect(
      validateFile("/path/to/file.txt", "file.txt")
    ).resolves.not.toThrow();
    await expect(
      validateFile("/path/to/file.json", "file.json")
    ).resolves.not.toThrow();
    await expect(
      validateFile("/path/to/file.xml", "file.xml")
    ).resolves.not.toThrow();
  });

  it("should validate file with spaces in path", async () => {
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.promises.access).mockResolvedValue(undefined);

    await expect(
      validateFile("/path/with spaces/file.html", "file.html")
    ).resolves.not.toThrow();
  });

  it("should validate file with special characters in name", async () => {
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.promises.access).mockResolvedValue(undefined);

    await expect(
      validateFile("/path/to/file-with-dashes.html", "file-with-dashes.html")
    ).resolves.not.toThrow();
    await expect(
      validateFile(
        "/path/to/file_with_underscores.html",
        "file_with_underscores.html"
      )
    ).resolves.not.toThrow();
  });
});
