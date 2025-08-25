// Component prop interfaces and related types
import { ActivityItem, ImportItem, StatusMetadata, UploadItem } from "./core";
import { StatusEvent } from "./events";

import React from "react";

export interface ActivityLogProps {
  className?: string;
  htmlFiles?: string[];
  showPagination?: boolean;
  itemsPerPage?: number;
  showCollapsible?: boolean;
  defaultExpandedFirst?: boolean;
}

export interface CollapsibleImportItemProps {
  item: ImportItem | UploadItem | ActivityItem;
  fileTitles: Map<string, string>;
  events: StatusEvent[];
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}

export interface ImportItemComponentProps {
  item: ActivityItem;
  fileTitles: Map<string, string>;
  className?: string;
}

export interface UploadItemComponentProps {
  item: UploadItem;
  className?: string;
}

export interface StepMessageProps {
  step: ProcessingStep;
  className?: string;
}

export interface ProcessingStepProps {
  step: ProcessingStep;
  isLast?: boolean;
  className?: string;
}

export interface StatusIconProps {
  status:
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "uploading"
    | "uploaded"
    | "cancelled";
  step?: ProcessingStep;
  className?: string;
}

export interface ConnectionStatusProps {
  connectionStatus:
    | "connecting"
    | "connected"
    | "disconnected"
    | "error"
    | "retrying";
  error?: string;
  className?: string;
}

export interface PaginationControlsProps {
  totalItems: number;
  className?: string;
}

export interface PendingUploadItemProps {
  htmlFile: string;
  extractedTitle?: string;
  index: number;
  className?: string;
}

export interface ProgressStatusBarProps {
  item: ActivityItem;
  className?: string;
}

export interface DetailedStatusProps {
  item: ActivityItem;
  events: StatusEvent[];
  className?: string;
}

export interface CollapsibleHeaderProps {
  item: ActivityItem;
  isExpanded: boolean;
  onToggle: () => void;
  styling: StylingConfig;
  hasDuplicate: boolean;
  statusText: string;
}

export interface CollapsibleContentProps {
  item: ActivityItem;
  events: StatusEvent[];
  previewUrl: string | null;
  className?: string;
}

export interface StylingConfig {
  backgroundColor: string;
  hoverBackgroundColor: string;
  textColor: string;
  borderColor: string;
}

export interface ProcessingStep {
  id: string;
  title: string;
  status: "pending" | "processing" | "completed" | "failed";
  metadata?: Partial<StatusMetadata>;
  message?: string;
  timestamp?: Date;
}

export interface FileUploadProps {
  className?: string;
  onUploadComplete?: (
    results: Array<{ success: boolean; fileName: string; error?: string }>
  ) => void;
  maxFileSize?: string;
  acceptedFileTypes?: string;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}
