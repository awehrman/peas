#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚂 Railway build script starting...");

// Check if we're in Railway environment
const isRailway =
  process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === "production";
const databaseUrl = process.env.DATABASE_URL;

console.log(`🔍 Environment check:`);
console.log(
  `   - RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT || "not set"}`
);
console.log(`   - NODE_ENV: ${process.env.NODE_ENV || "not set"}`);
console.log(`   - DATABASE_URL: ${databaseUrl ? "set" : "not set"}`);
console.log(`   - isRailway: ${isRailway}`);
const schemaPath = path.join(__dirname, "..", "schema.prisma");
const minimalSchemaPath = path.join(__dirname, "minimal-schema.prisma");

// Always use the real schema, but generate without engine
console.log("🔧 Building schema from source files...");
try {
  execSync("node scripts/build-schema.js", {
    cwd: path.join(__dirname, ".."),
    stdio: "pipe",
  });
  console.log("✅ Schema built successfully");
} catch (error) {
  console.error("❌ Failed to build schema:", error.message);
  process.exit(1);
}

// Skip Prisma generation during build - it will be generated at runtime
console.log(
  "⏭️  Skipping Prisma generation during build (will generate at runtime)"
);

// Compile TypeScript
console.log("📝 Compiling TypeScript...");
try {
  // Capture output to suppress Yarn's verbose logging
  const tscOutput = execSync("npx tsc --pretty false", {
    cwd: path.join(__dirname, ".."),
    stdio: "pipe",
    timeout: 30000, // 30 second timeout
  });
  console.log("✅ TypeScript compilation successful");
} catch (error) {
  console.error("❌ TypeScript compilation failed:", error.message);
  if (error.signal === "SIGTERM") {
    console.error("❌ TypeScript compilation timed out after 30 seconds");
  }
  process.exit(1);
}

console.log("🎉 Railway build completed successfully!");
