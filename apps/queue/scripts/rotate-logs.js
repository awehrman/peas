#!/usr/bin/env node
/**
 * Script to force rotate log files and test truncation
 * Usage: node scripts/rotate-logs.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, "..", "logs");
const MAIN_LOG = path.join(LOG_DIR, "queue-worker.log");
const ERROR_LOG = path.join(LOG_DIR, "queue-worker-error.log");

function forceRotateLogs() {
  console.log("🔄 Starting log rotation...");

  const timestamp = new Date().toISOString().split("T")[0];

  [MAIN_LOG, ERROR_LOG].forEach((logFile) => {
    try {
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(
          `📊 Current size of ${path.basename(logFile)}: ${sizeInMB}MB`
        );

        const backupPath = `${logFile}.${timestamp}.backup`;
        fs.renameSync(logFile, backupPath);

        console.log(
          `✅ Rotated: ${path.basename(logFile)} -> ${path.basename(backupPath)}`
        );
      } else {
        console.log(`ℹ️  Log file doesn't exist: ${path.basename(logFile)}`);
      }
    } catch (error) {
      console.error(
        `❌ Failed to rotate ${path.basename(logFile)}:`,
        error.message
      );
    }
  });

  // Clean up old backup files (keep only 3)
  cleanupOldBackups();

  console.log("✅ Log rotation completed!");
}

function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(LOG_DIR);
    const backupFiles = files
      .filter((file) => file.endsWith(".backup"))
      .map((file) => ({
        name: file,
        path: path.join(LOG_DIR, file),
        mtime: fs.statSync(path.join(LOG_DIR, file)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime); // Sort by modification time, newest first

    // Keep only the 3 most recent backup files
    const maxBackupFiles = 3;
    if (backupFiles.length > maxBackupFiles) {
      const filesToRemove = backupFiles.slice(maxBackupFiles);
      filesToRemove.forEach((file) => {
        fs.unlinkSync(file.path);
        console.log(`🗑️  Removed old backup: ${file.name}`);
      });
    }
  } catch (error) {
    console.error("❌ Failed to cleanup old backups:", error.message);
  }
}

function showLogStats() {
  console.log("\n📊 Current log statistics:");

  [MAIN_LOG, ERROR_LOG].forEach((logFile) => {
    try {
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`  ${path.basename(logFile)}: ${sizeInMB}MB`);
      } else {
        console.log(`  ${path.basename(logFile)}: File doesn't exist`);
      }
    } catch (error) {
      console.log(`  ${path.basename(logFile)}: Error reading file`);
    }
  });

  // Show backup files
  try {
    const files = fs.readdirSync(LOG_DIR);
    const backupFiles = files.filter((file) => file.endsWith(".backup"));
    if (backupFiles.length > 0) {
      console.log("\n📁 Backup files:");
      backupFiles.forEach((file) => {
        const filePath = path.join(LOG_DIR, file);
        const stats = fs.statSync(filePath);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`  ${file}: ${sizeInMB}MB`);
      });
    }
  } catch (error) {
    console.error("❌ Failed to read backup files:", error.message);
  }
}

// Main execution
showLogStats();
forceRotateLogs();
console.log("\n📊 Log statistics after rotation:");
showLogStats();
