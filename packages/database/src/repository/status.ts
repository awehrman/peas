import { prisma } from "../client.js";

export async function addStatusEvent({
  noteId,
  status,
  message,
  context,
  currentCount,
  totalCount,
}: {
  noteId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "DUPLICATE";
  message?: string;
  context?: string;
  currentCount?: number;
  totalCount?: number;
}) {
  return prisma.noteStatusEvent.create({
    data: {
      noteId,
      status,
      errorMessage: message,
      context,
      currentCount,
      totalCount,
    },
  });
}
