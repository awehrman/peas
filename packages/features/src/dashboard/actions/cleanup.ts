"use server";

import { cleanupAllData } from "@peas/database";

export async function cleanupAllDataAction(): Promise<{
  success: boolean;
  message: string;
  deletedCounts?: Record<string, number>;
}> {
  try {
    console.warn("DANGEROUS OPERATION: Cleaning up all database data");
    
    const { deletedCounts } = await cleanupAllData();

    console.log("Database cleanup completed:", deletedCounts);

    return {
      success: true,
      message: "All data has been deleted from the database",
      deletedCounts,
    };
  } catch (error) {
    console.error("Failed to cleanup database:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
} 