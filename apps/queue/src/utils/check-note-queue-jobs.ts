#!/usr/bin/env node
import { getQueueJobByNoteId } from "@peas/database";

async function checkNoteQueueJobs(noteId: string) {
  console.log(`=== QueueJob Status for Note: ${noteId} ===\n`);

  try {
    // Check all jobs for this note
    const allJobs = await getQueueJobByNoteId(noteId);
    console.log(`📋 Total jobs for note: ${allJobs.length}`);

    if (allJobs.length === 0) {
      console.log("No QueueJob entries found for this note.");
      return;
    }

    // Group by status
    const jobsByStatus = allJobs.reduce(
      (acc, job) => {
        if (!acc[job.status]) {
          acc[job.status] = [];
        }
        acc[job.status]!.push(job);
        return acc;
      },
      {} as Record<string, typeof allJobs>
    );

    // Display jobs by status
    Object.entries(jobsByStatus).forEach(([status, jobs]) => {
      console.log(`\n${getStatusEmoji(status)} ${status} jobs: ${jobs.length}`);
      jobs.forEach((job) => {
        console.log(
          `  - ${job.type} (${job.jobId}) - Created: ${job.createdAt.toISOString()}`
        );
        if (job.startedAt) {
          console.log(`    Started: ${job.startedAt.toISOString()}`);
        }
        if (job.completedAt) {
          console.log(`    Completed: ${job.completedAt.toISOString()}`);
        }
        if (job.errorMessage) {
          console.log(`    Error: ${job.errorMessage}`);
        }
      });
    });

    // Check categorization jobs specifically
    const categorizationJobs = allJobs.filter(
      (job) => job.type === "PROCESS_CATEGORIZATION"
    );
    console.log(
      `\n🏷️  Categorization jobs for this note: ${categorizationJobs.length}`
    );
    categorizationJobs.forEach((job) => {
      console.log(`  - ${job.status} (${job.jobId})`);
      if (job.errorMessage) {
        console.log(`    Error: ${job.errorMessage}`);
      }
    });
  } catch (error) {
    console.error("Error checking QueueJobs for note:", error);
  }
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case "PENDING":
      return "📋";
    case "PROCESSING":
      return "⚙️";
    case "COMPLETED":
      return "✅";
    case "FAILED":
      return "❌";
    case "CANCELLED":
      return "🚫";
    default:
      return "❓";
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const noteId = process.argv[2];
  if (!noteId) {
    console.error("Usage: node check-note-queue-jobs.ts <noteId>");
    throw new Error("Note ID is required");
  }
  
  checkNoteQueueJobs(noteId)
    .then(() => {
      // Script completed successfully
    })
    .catch((error) => {
      console.error("Script failed:", error);
      throw error;
    });
}

export { checkNoteQueueJobs };
