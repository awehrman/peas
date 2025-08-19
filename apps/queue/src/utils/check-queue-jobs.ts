#!/usr/bin/env node
import { getQueueJobByStatus } from "@peas/database";

async function checkQueueJobs() {
  console.log("=== QueueJob Status Check ===\n");

  try {
    // Check all pending jobs
    const pendingJobs = await getQueueJobByStatus("PENDING");
    console.log(`📋 PENDING jobs: ${pendingJobs.length}`);
    pendingJobs.forEach((job) => {
      console.log(`  - ${job.type} (${job.jobId}) for note ${job.noteId}`);
    });

    // Check all processing jobs
    const processingJobs = await getQueueJobByStatus("PROCESSING");
    console.log(`\n⚙️  PROCESSING jobs: ${processingJobs.length}`);
    processingJobs.forEach((job) => {
      console.log(`  - ${job.type} (${job.jobId}) for note ${job.noteId}`);
    });

    // Check all completed jobs
    const completedJobs = await getQueueJobByStatus("COMPLETED");
    console.log(`\n✅ COMPLETED jobs: ${completedJobs.length}`);
    completedJobs.slice(-5).forEach((job) => {
      console.log(`  - ${job.type} (${job.jobId}) for note ${job.noteId}`);
    });

    // Check all failed jobs
    const failedJobs = await getQueueJobByStatus("FAILED");
    console.log(`\n❌ FAILED jobs: ${failedJobs.length}`);
    failedJobs.slice(-5).forEach((job) => {
      console.log(
        `  - ${job.type} (${job.jobId}) for note ${job.noteId} - ${job.errorMessage || "No error message"}`
      );
    });

    // Check categorization jobs specifically
    console.log(`\n🏷️  Categorization jobs:`);
    const allJobs = [
      ...pendingJobs,
      ...processingJobs,
      ...completedJobs,
      ...failedJobs,
    ];
    const categorizationJobs = allJobs.filter(
      (job) => job.type === "PROCESS_CATEGORIZATION"
    );
    console.log(`  Total: ${categorizationJobs.length}`);
    categorizationJobs.forEach((job) => {
      console.log(`  - ${job.status} (${job.jobId}) for note ${job.noteId}`);
    });
  } catch (error) {
    console.error("Error checking QueueJobs:", error);
    throw error;
  }
}

export async function runCli() {
  try {
    await checkQueueJobs();
  } catch (error) {
    console.error("Script failed:", error);
    throw error;
  }
}

// Run if called directly
/* istanbul ignore next -- @preserve */
if (import.meta.url === `file://${process.argv[1]}`) {
  runCli();
}

export { checkQueueJobs };
