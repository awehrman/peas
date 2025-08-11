import { Request } from 'express';

// Extended Express Request interface to include webkit directory properties
export interface WebkitUploadRequest extends Request {
  body: {
    [key: string]: string;
  };
}

// Extended Multer file interface to include webkit directory properties
export interface WebkitFile {
  originalname: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  webkitRelativePath?: string;
}

// Type guard to check if a file has webkit directory properties
export function isWebkitFile(file: unknown): file is WebkitFile {
  return Boolean(file && typeof file === 'object' && file !== null && 'webkitRelativePath' in file);
}

// Type guard to check if a file came from a directory upload
export function isFromDirectory(file: unknown): boolean {
  if (!isWebkitFile(file)) return false;
  return Boolean(file.webkitRelativePath && file.webkitRelativePath.includes('/'));
}

// Interface for directory upload information
export interface DirectoryUploadInfo {
  fileIndex: number;
  webkitRelativePath: string;
  originalName: string;
}
