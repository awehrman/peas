import { prisma } from "../client";
import type { QueueJob, QueueJobStatus, QueueJobType, ErrorCode } from "@prisma/client";

export interface CreateQueueJobData {
  jobId: string;
  type: QueueJobType;
  status?: QueueJobStatus;
  noteId: string;
  data?: Record<string, unknown>;
  errorMessage?: string;
  errorCode?: ErrorCode;
  errorDetails?: Record<string, unknown>;
  retryCount?: number;
  maxRetries?: number;
}

export interface UpdateQueueJobData {
  status?: QueueJobStatus;
  errorMessage?: string;
  errorCode?: ErrorCode;
  errorDetails?: Record<string, unknown>;
  retryCount?: number;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Create a new QueueJob entry
 */
export async function createQueueJob(data: CreateQueueJobData): Promise<QueueJob> {
  return prisma.queueJob.create({
    data: {
      jobId: data.jobId,
      type: data.type,
      status: data.status || "PENDING",
      noteId: data.noteId,
      data: data.data as any,
      errorMessage: data.errorMessage,
      errorCode: data.errorCode,
      errorDetails: data.errorDetails as any,
      retryCount: data.retryCount || 0,
      maxRetries: data.maxRetries || 3,
    },
  });
}

/**
 * Update an existing QueueJob entry
 */
export async function updateQueueJob(
  jobId: string,
  data: UpdateQueueJobData
): Promise<QueueJob> {
  return prisma.queueJob.update({
    where: { jobId },
    data: {
      status: data.status,
      errorMessage: data.errorMessage,
      errorCode: data.errorCode,
      errorDetails: data.errorDetails as any,
      retryCount: data.retryCount,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
    },
  });
}

/**
 * Get QueueJob entries by note ID and type
 */
export async function getQueueJobByNoteId(
  noteId: string,
  type?: QueueJobType
): Promise<QueueJob[]> {
  return prisma.queueJob.findMany({
    where: {
      noteId,
      ...(type && { type }),
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get QueueJob entries by status
 */
export async function getQueueJobByStatus(
  status: QueueJobStatus
): Promise<QueueJob[]> {
  return prisma.queueJob.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get a single QueueJob by job ID
 */
export async function getQueueJobByJobId(
  jobId: string
): Promise<QueueJob | null> {
  return prisma.queueJob.findUnique({
    where: { jobId },
  });
}

/**
 * Delete QueueJob entries (for cleanup)
 */
export async function deleteQueueJob(jobId: string): Promise<QueueJob> {
  return prisma.queueJob.delete({
    where: { jobId },
  });
}
