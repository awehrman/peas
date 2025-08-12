import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { promises as fs } from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { R2Service } from "../service";

// Mock AWS SDK
vi.mock("@aws-sdk/client-s3");
vi.mock("@aws-sdk/s3-request-presigner");
vi.mock("fs", () => ({
  promises: {
    readFile: vi.fn(),
    stat: vi.fn(),
  },
}));
vi.mock("path", () => ({
  default: {
    extname: vi.fn(),
  },
}));

describe("R2Service", () => {
  let r2Service: R2Service;
  let mockS3Client: { send: ReturnType<typeof vi.fn> };
  let mockGetSignedUrl: ReturnType<typeof vi.fn>;

  const mockConfig = {
    accountId: "test-account",
    accessKeyId: "test-access-key",
    secretAccessKey: "test-secret-key",
    bucketName: "test-bucket",
    publicUrl: "https://example.com",
  };

  const mockConfigWithoutPublicUrl = {
    accountId: "test-account",
    accessKeyId: "test-access-key",
    secretAccessKey: "test-secret-key",
    bucketName: "test-bucket",
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock S3Client constructor
    mockS3Client = {
      send: vi.fn(),
    };
    (S3Client as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => mockS3Client
    );

    // Mock getSignedUrl
    mockGetSignedUrl = vi.fn();
    (getSignedUrl as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      mockGetSignedUrl
    );

    // Mock fs functions
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from("test content"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(fs.stat).mockResolvedValue({ size: 123 } as any);

    // Mock path.extname
    vi.mocked(path.extname).mockReturnValue(".jpg");

    r2Service = new R2Service(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create R2Service with valid config", () => {
      expect(r2Service).toBeInstanceOf(R2Service);
      expect(S3Client).toHaveBeenCalledWith({
        region: "auto",
        endpoint: "https://test-account.r2.cloudflarestorage.com",
        credentials: {
          accessKeyId: "test-access-key",
          secretAccessKey: "test-secret-key",
        },
      });
    });

    it("should create R2Service without publicUrl", () => {
      const service = new R2Service(mockConfigWithoutPublicUrl);
      expect(service).toBeInstanceOf(R2Service);
    });
  });

  describe("uploadFile", () => {
    it("should upload file successfully", async () => {
      const mockResult = { ETag: '"test-etag"' };
      mockS3Client.send.mockResolvedValue(mockResult);
      mockGetSignedUrl.mockResolvedValue("https://presigned-url.com");

      const result = await r2Service.uploadFile(
        "/path/to/file.jpg",
        "test-key.jpg"
      );

      expect(fs.readFile).toHaveBeenCalledWith("/path/to/file.jpg");
      expect(fs.stat).toHaveBeenCalledWith("/path/to/file.jpg");
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          constructor: expect.any(Function),
        })
      );
      expect(mockGetSignedUrl).toHaveBeenCalled();
      expect(result).toEqual({
        key: "test-key.jpg",
        url: "https://presigned-url.com",
        size: 123,
        etag: "test-etag",
      });
    });

    it("should upload file with custom contentType", async () => {
      const mockResult = { ETag: '"test-etag"' };
      mockS3Client.send.mockResolvedValue(mockResult);
      mockGetSignedUrl.mockResolvedValue("https://presigned-url.com");

      const result = await r2Service.uploadFile(
        "/path/to/file.jpg",
        "test-key.jpg",
        "image/png"
      );

      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          constructor: expect.any(Function),
        })
      );
      expect(result).toEqual({
        key: "test-key.jpg",
        url: "https://presigned-url.com",
        size: 123,
        etag: "test-etag",
      });
    });

    it("should handle upload error", async () => {
      const error = new Error("Upload failed");
      mockS3Client.send.mockRejectedValue(error);

      await expect(
        r2Service.uploadFile("/path/to/file.jpg", "test-key.jpg")
      ).rejects.toThrow("Failed to upload file to R2: Upload failed");
    });

    it("should handle file read error", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("File not found"));

      await expect(
        r2Service.uploadFile("/path/to/file.jpg", "test-key.jpg")
      ).rejects.toThrow("Failed to upload file to R2: File not found");
    });

    it("should handle file stat error", async () => {
      vi.mocked(fs.stat).mockRejectedValue(new Error("Stat failed"));

      await expect(
        r2Service.uploadFile("/path/to/file.jpg", "test-key.jpg")
      ).rejects.toThrow("Failed to upload file to R2: Stat failed");
    });

    it("should handle non-Error objects", async () => {
      mockS3Client.send.mockRejectedValue("String error");

      await expect(
        r2Service.uploadFile("/path/to/file.jpg", "test-key.jpg")
      ).rejects.toThrow("Failed to upload file to R2: String error");
    });
  });

  describe("uploadBuffer", () => {
    it("should upload buffer successfully", async () => {
      const mockResult = { ETag: '"test-etag"' };
      mockS3Client.send.mockResolvedValue(mockResult);
      mockGetSignedUrl.mockResolvedValue("https://presigned-url.com");

      const buffer = Buffer.from("test buffer content");
      const result = await r2Service.uploadBuffer(
        buffer,
        "test-key.jpg",
        "image/jpeg"
      );

      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          constructor: expect.any(Function),
        })
      );
      expect(mockGetSignedUrl).toHaveBeenCalled();
      expect(result).toEqual({
        key: "test-key.jpg",
        url: "https://presigned-url.com",
        size: buffer.length,
        etag: "test-etag",
      });
    });

    it("should upload buffer without contentType", async () => {
      const mockResult = { ETag: '"test-etag"' };
      mockS3Client.send.mockResolvedValue(mockResult);
      mockGetSignedUrl.mockResolvedValue("https://presigned-url.com");

      const buffer = Buffer.from("test buffer content");
      const result = await r2Service.uploadBuffer(buffer, "test-key.jpg");

      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          constructor: expect.any(Function),
        })
      );
      expect(result).toEqual({
        key: "test-key.jpg",
        url: "https://presigned-url.com",
        size: buffer.length,
        etag: "test-etag",
      });
    });

    it("should handle upload error", async () => {
      const error = new Error("Upload failed");
      mockS3Client.send.mockRejectedValue(error);

      const buffer = Buffer.from("test buffer content");
      await expect(
        r2Service.uploadBuffer(buffer, "test-key.jpg")
      ).rejects.toThrow("Failed to upload buffer to R2: Upload failed");
    });

    it("should handle non-Error objects", async () => {
      mockS3Client.send.mockRejectedValue("String error");

      const buffer = Buffer.from("test buffer content");
      await expect(
        r2Service.uploadBuffer(buffer, "test-key.jpg")
      ).rejects.toThrow("Failed to upload buffer to R2: String error");
    });
  });

  describe("generatePresignedUploadUrl", () => {
    it("should generate presigned upload URL with default expiry", async () => {
      mockGetSignedUrl.mockResolvedValue("https://presigned-upload-url.com");

      const result = await r2Service.generatePresignedUploadUrl(
        "test-key.jpg",
        "image/jpeg"
      );

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        mockS3Client,
        expect.objectContaining({
          constructor: expect.any(Function),
        }),
        { expiresIn: 3600 }
      );
      expect(result).toBe("https://presigned-upload-url.com");
    });

    it("should generate presigned upload URL with custom expiry", async () => {
      mockGetSignedUrl.mockResolvedValue("https://presigned-upload-url.com");

      const result = await r2Service.generatePresignedUploadUrl(
        "test-key.jpg",
        "image/jpeg",
        7200
      );

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        mockS3Client,
        expect.objectContaining({
          constructor: expect.any(Function),
        }),
        { expiresIn: 7200 }
      );
      expect(result).toBe("https://presigned-upload-url.com");
    });

    it("should handle error", async () => {
      const error = new Error("URL generation failed");
      mockGetSignedUrl.mockRejectedValue(error);

      await expect(
        r2Service.generatePresignedUploadUrl("test-key.jpg", "image/jpeg")
      ).rejects.toThrow(
        "Failed to generate presigned URL: URL generation failed"
      );
    });

    it("should handle non-Error objects", async () => {
      mockGetSignedUrl.mockRejectedValue("String error");

      await expect(
        r2Service.generatePresignedUploadUrl("test-key.jpg", "image/jpeg")
      ).rejects.toThrow("Failed to generate presigned URL: String error");
    });
  });

  describe("generatePresignedDownloadUrl", () => {
    it("should generate presigned download URL with default expiry", async () => {
      mockGetSignedUrl.mockResolvedValue("https://presigned-download-url.com");

      const result =
        await r2Service.generatePresignedDownloadUrl("test-key.jpg");

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        mockS3Client,
        expect.objectContaining({
          constructor: expect.any(Function),
        }),
        { expiresIn: 3600 }
      );
      expect(result).toBe("https://presigned-download-url.com");
    });

    it("should generate presigned download URL with custom expiry", async () => {
      mockGetSignedUrl.mockResolvedValue("https://presigned-download-url.com");

      const result = await r2Service.generatePresignedDownloadUrl(
        "test-key.jpg",
        7200
      );

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        mockS3Client,
        expect.objectContaining({
          constructor: expect.any(Function),
        }),
        { expiresIn: 7200 }
      );
      expect(result).toBe("https://presigned-download-url.com");
    });

    it("should handle error", async () => {
      const error = new Error("URL generation failed");
      mockGetSignedUrl.mockRejectedValue(error);

      await expect(
        r2Service.generatePresignedDownloadUrl("test-key.jpg")
      ).rejects.toThrow(
        "Failed to generate presigned download URL: URL generation failed"
      );
    });

    it("should handle non-Error objects", async () => {
      mockGetSignedUrl.mockRejectedValue("String error");

      await expect(
        r2Service.generatePresignedDownloadUrl("test-key.jpg")
      ).rejects.toThrow(
        "Failed to generate presigned download URL: String error"
      );
    });
  });

  describe("getPublicUrl", () => {
    it("should return public URL when publicUrl is configured", () => {
      // Access private method through type assertion
      const service = r2Service as unknown as {
        getPublicUrl: (key: string) => string;
      };
      const result = service.getPublicUrl("test-key.jpg");

      expect(result).toBe("https://example.com/test-key.jpg");
    });

    it("should return fallback URL when publicUrl is not configured", () => {
      const serviceWithoutPublicUrl = new R2Service(mockConfigWithoutPublicUrl);
      const service = serviceWithoutPublicUrl as unknown as {
        getPublicUrl: (key: string) => string;
      };
      const result = service.getPublicUrl("test-key.jpg");

      expect(result).toBe(
        "https://test-account.r2.cloudflarestorage.com/test-bucket/test-key.jpg"
      );
    });
  });

  describe("getContentType", () => {
    it("should return correct content type for jpg", () => {
      vi.mocked(path.extname).mockReturnValue(".jpg");
      const service = r2Service as unknown as {
        getContentType: (filePath: string) => string;
      };
      const result = service.getContentType("test.jpg");

      expect(result).toBe("image/jpeg");
    });

    it("should return correct content type for jpeg", () => {
      vi.mocked(path.extname).mockReturnValue(".jpeg");
      const service = r2Service as unknown as {
        getContentType: (filePath: string) => string;
      };
      const result = service.getContentType("test.jpeg");

      expect(result).toBe("image/jpeg");
    });

    it("should return correct content type for png", () => {
      vi.mocked(path.extname).mockReturnValue(".png");
      const service = r2Service as unknown as {
        getContentType: (filePath: string) => string;
      };
      const result = service.getContentType("test.png");

      expect(result).toBe("image/png");
    });

    it("should return correct content type for gif", () => {
      vi.mocked(path.extname).mockReturnValue(".gif");
      const service = r2Service as unknown as {
        getContentType: (filePath: string) => string;
      };
      const result = service.getContentType("test.gif");

      expect(result).toBe("image/gif");
    });

    it("should return correct content type for webp", () => {
      vi.mocked(path.extname).mockReturnValue(".webp");
      const service = r2Service as unknown as {
        getContentType: (filePath: string) => string;
      };
      const result = service.getContentType("test.webp");

      expect(result).toBe("image/webp");
    });

    it("should return correct content type for bmp", () => {
      vi.mocked(path.extname).mockReturnValue(".bmp");
      const service = r2Service as unknown as {
        getContentType: (filePath: string) => string;
      };
      const result = service.getContentType("test.bmp");

      expect(result).toBe("image/bmp");
    });

    it("should return correct content type for svg", () => {
      vi.mocked(path.extname).mockReturnValue(".svg");
      const service = r2Service as unknown as {
        getContentType: (filePath: string) => string;
      };
      const result = service.getContentType("test.svg");

      expect(result).toBe("image/svg+xml");
    });

    it("should return correct content type for ico", () => {
      vi.mocked(path.extname).mockReturnValue(".ico");
      const service = r2Service as unknown as {
        getContentType: (filePath: string) => string;
      };
      const result = service.getContentType("test.ico");

      expect(result).toBe("image/x-icon");
    });

    it("should return default content type for unknown extension", () => {
      vi.mocked(path.extname).mockReturnValue(".unknown");
      const service = r2Service as unknown as {
        getContentType: (filePath: string) => string;
      };
      const result = service.getContentType("test.unknown");

      expect(result).toBe("application/octet-stream");
    });

    it("should return default content type for no extension", () => {
      vi.mocked(path.extname).mockReturnValue("");
      const service = r2Service as unknown as {
        getContentType: (filePath: string) => string;
      };
      const result = service.getContentType("test");

      expect(result).toBe("application/octet-stream");
    });
  });

  describe("isConfigured", () => {
    it("should return true when all required environment variables are set", () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        R2_ACCOUNT_ID: "test-account",
        R2_ACCESS_KEY_ID: "test-access-key",
        R2_SECRET_ACCESS_KEY: "test-secret-key",
        R2_BUCKET_NAME: "test-bucket",
      };

      expect(R2Service.isConfigured()).toBe(true);
      process.env = originalEnv;
    });

    it("should return false when any required environment variable is missing", () => {
      const originalEnv = process.env;
      // Clear all R2 environment variables first
      process.env = {
        ...originalEnv,
        R2_ACCOUNT_ID: "test-account",
        R2_ACCESS_KEY_ID: "test-access-key",
        R2_SECRET_ACCESS_KEY: undefined,
        R2_BUCKET_NAME: undefined,
        R2_PUBLIC_URL: undefined,
      };

      expect(R2Service.isConfigured()).toBe(false);
      process.env = originalEnv;
    });

    it("should return false when all environment variables are missing", () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        R2_ACCOUNT_ID: undefined,
        R2_ACCESS_KEY_ID: undefined,
        R2_SECRET_ACCESS_KEY: undefined,
        R2_BUCKET_NAME: undefined,
        R2_PUBLIC_URL: undefined,
      };

      expect(R2Service.isConfigured()).toBe(false);
      process.env = originalEnv;
    });
  });

  describe("fromEnvironment", () => {
    it("should create R2Service instance when properly configured", () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        R2_ACCOUNT_ID: "test-account",
        R2_ACCESS_KEY_ID: "test-access-key",
        R2_SECRET_ACCESS_KEY: "test-secret-key",
        R2_BUCKET_NAME: "test-bucket",
        R2_PUBLIC_URL: "https://example.com",
      };

      const service = R2Service.fromEnvironment();
      expect(service).toBeInstanceOf(R2Service);
      process.env = originalEnv;
    });

    it("should create R2Service instance without publicUrl", () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        R2_ACCOUNT_ID: "test-account",
        R2_ACCESS_KEY_ID: "test-access-key",
        R2_SECRET_ACCESS_KEY: "test-secret-key",
        R2_BUCKET_NAME: "test-bucket",
        R2_PUBLIC_URL: undefined,
      };

      const service = R2Service.fromEnvironment();
      expect(service).toBeInstanceOf(R2Service);
      process.env = originalEnv;
    });

    it("should return null when not properly configured", () => {
      const originalEnv = process.env;
      // Clear all R2 environment variables
      process.env = {
        ...originalEnv,
        R2_ACCOUNT_ID: undefined,
        R2_ACCESS_KEY_ID: undefined,
        R2_SECRET_ACCESS_KEY: undefined,
        R2_BUCKET_NAME: undefined,
        R2_PUBLIC_URL: undefined,
      };

      const service = R2Service.fromEnvironment();
      expect(service).toBeNull();
      process.env = originalEnv;
    });
  });
});
