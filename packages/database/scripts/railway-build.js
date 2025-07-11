#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚂 Railway build script starting...");

// Check if DATABASE_URL is available
const databaseUrl = process.env.DATABASE_URL;
const schemaPath = path.join(__dirname, "..", "schema.prisma");

if (!databaseUrl) {
  console.log(
    "⚠️  DATABASE_URL not found, using real schema.prisma for type generation only. Some generators may fail if they require a live DB connection, but Prisma Client types will be generated."
  );
  // Do NOT overwrite schema.prisma; just use the real one
} else {
  console.log("✅ DATABASE_URL found, building full schema...");
  // Run the normal build schema script to ensure schema.prisma is up to date
  try {
    execSync("node scripts/build-schema.js", {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
    });
  } catch (error) {
    console.error("❌ Failed to build schema:", error.message);
    process.exit(1);
  }
}

// Generate Prisma client
console.log("🔧 Generating Prisma client...");
try {
  execSync("prisma generate", {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });
  console.log("✅ Prisma client generated successfully");
} catch (error) {
  console.error("❌ Failed to generate Prisma client:", error.message);
  process.exit(1);
}

// Compile TypeScript
console.log("📝 Compiling TypeScript...");
try {
  execSync("npx tsc", {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });
  console.log("✅ TypeScript compilation successful");
} catch (error) {
  console.error("❌ TypeScript compilation failed:", error.message);
  process.exit(1);
}

console.log("🎉 Railway build completed successfully!");
