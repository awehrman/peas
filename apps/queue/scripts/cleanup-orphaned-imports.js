#!/usr/bin/env node

/**
 * Cleanup script for orphaned import directories
 * This script removes empty import directories that may have accumulated
 * from failed or incomplete uploads.
 */

import fs from "fs/promises";
import path from "path";

const UPLOADS_IMAGES_DIR = path.join(process.cwd(), "uploads", "images");

async function cleanupOrphanedImportDirectories() {
  console.log("🧹 Starting cleanup of orphaned import directories...");
  
  try {
    // Check if the uploads/images directory exists
    const dirStats = await fs.stat(UPLOADS_IMAGES_DIR);
    if (!dirStats.isDirectory()) {
      console.log("❌ Uploads images directory does not exist:", UPLOADS_IMAGES_DIR);
      return;
    }

    // List all import directories
    const contents = await fs.readdir(UPLOADS_IMAGES_DIR);
    const importDirs = contents.filter(item => 
      item.startsWith("import_") && 
      item.includes("_") && 
      item.split("_").length >= 3
    );

    console.log(`📁 Found ${importDirs.length} import directories`);

    let cleanedCount = 0;
    let failedCount = 0;

    for (const importDir of importDirs) {
      const importDirPath = path.join(UPLOADS_IMAGES_DIR, importDir);
      
      try {
        const dirStats = await fs.stat(importDirPath);
        if (!dirStats.isDirectory()) {
          continue;
        }

        // Check if directory is empty
        const dirContents = await fs.readdir(importDirPath);
        
        if (dirContents.length === 0) {
          // Directory is empty, remove it
          await fs.rmdir(importDirPath);
          console.log(`✅ Removed empty import directory: ${importDir}`);
          cleanedCount++;
        } else {
          console.log(`⚠️  Import directory not empty (${dirContents.length} items): ${importDir}`);
          
          // Try to clean up any remaining files
          let filesRemoved = 0;
          for (const item of dirContents) {
            const itemPath = path.join(importDirPath, item);
            try {
              const itemStats = await fs.stat(itemPath);
              if (itemStats.isFile()) {
                await fs.unlink(itemPath);
                filesRemoved++;
              }
            } catch (fileError) {
              console.log(`❌ Failed to remove file ${itemPath}: ${fileError.message}`);
            }
          }
          
          // Try to remove the directory again after cleaning files
          try {
            const remainingContents = await fs.readdir(importDirPath);
            if (remainingContents.length === 0) {
              await fs.rmdir(importDirPath);
              console.log(`✅ Removed import directory after file cleanup: ${importDir}`);
              cleanedCount++;
            } else {
              console.log(`⚠️  Import directory still has ${remainingContents.length} items after cleanup: ${importDir}`);
            }
          } catch (finalError) {
            console.log(`❌ Could not remove import directory after cleanup: ${importDir} - ${finalError.message}`);
            failedCount++;
          }
        }
      } catch (error) {
        console.log(`❌ Error processing import directory ${importDir}: ${error.message}`);
        failedCount++;
      }
    }

    console.log(`\n📊 Cleanup Summary:`);
    console.log(`   ✅ Successfully cleaned: ${cleanedCount} directories`);
    console.log(`   ❌ Failed to clean: ${failedCount} directories`);
    console.log(`   📁 Total import directories processed: ${importDirs.length}`);

  } catch (error) {
    console.error("❌ Failed to cleanup orphaned import directories:", error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupOrphanedImportDirectories()
  .then(() => {
    console.log("🎉 Cleanup completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Cleanup failed:", error);
    process.exit(1);
  });
