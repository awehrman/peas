import { Request } from "express";

// Extended Express Request interface for upload requests
export interface UploadRequest extends Request {
  body: {
    [key: string]: string;
  };
}
