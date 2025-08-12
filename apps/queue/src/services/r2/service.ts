import type { R2Config, UploadResult } from "./types";

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { promises as fs } from "fs";
import path from "path";

export class R2Service {
  private client: S3Client;
  private config: R2Config;

  constructor(config: R2Config) {
    this.config = config;

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  /**
   * Upload a file to R2 storage
   */
  async uploadFile(
    filePath: string,
    key: string,
    contentType?: string
  ): Promise<UploadResult> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const fileStats = await fs.stat(filePath);

      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType || this.getContentType(filePath),
        ContentLength: fileStats.size,
      });

      const result = await this.client.send(command);

      // Generate a presigned URL for accessing the file
      const url = await this.generatePresignedDownloadUrl(key);

      return {
        key,
        url,
        size: fileStats.size,
        etag: result.ETag?.replace(/"/g, ""), // Remove quotes from ETag
      };
    } catch (error) {
      throw new Error(
        `Failed to upload file to R2: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Upload a buffer to R2 storage
   */
  async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType?: string
  ): Promise<UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ContentLength: buffer.length,
      });

      const result = await this.client.send(command);

      // Generate a presigned URL for accessing the file
      const url = await this.generatePresignedDownloadUrl(key);

      return {
        key,
        url,
        size: buffer.length,
        etag: result.ETag?.replace(/"/g, ""),
      };
    } catch (error) {
      throw new Error(
        `Failed to upload buffer to R2: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate a presigned URL for uploading
   */
  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        ContentType: contentType,
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      throw new Error(
        `Failed to generate presigned URL: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate a presigned URL for downloading
   */
  async generatePresignedDownloadUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      throw new Error(
        `Failed to generate presigned download URL: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get the public URL for a file
   */
  private getPublicUrl(key: string): string {
    if (this.config.publicUrl) {
      return `${this.config.publicUrl}/${key}`;
    }

    // Fallback to R2 public URL format
    return `https://${this.config.accountId}.r2.cloudflarestorage.com/${this.config.bucketName}/${key}`;
  }

  /**
   * Determine content type from file extension
   */
  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();

    const contentTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".bmp": "image/bmp",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
    };

    return contentTypes[ext] || "application/octet-stream";
  }

  /**
   * Check if R2 is properly configured
   */
  static isConfigured(): boolean {
    return !!(
      process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME
    );
  }

  /**
   * Create R2Service instance from environment variables
   */
  static fromEnvironment(): R2Service | null {
    if (!this.isConfigured()) {
      return null;
    }

    const config: R2Config = {
      accountId: process.env.R2_ACCOUNT_ID!,
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      bucketName: process.env.R2_BUCKET_NAME!,
      publicUrl: process.env.R2_PUBLIC_URL,
    };

    return new R2Service(config);
  }
}
