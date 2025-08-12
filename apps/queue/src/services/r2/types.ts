export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl?: string;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  etag?: string;
}
