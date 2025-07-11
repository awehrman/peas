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
const schemaPath = path.join(__dirname, "..", "schema.prisma");
const minimalSchemaPath = path.join(__dirname, "minimal-schema.prisma");

if (!databaseUrl || isRailway) {
  console.log(
    `⚠️  ${!databaseUrl ? "DATABASE_URL not found" : "Railway environment detected"}, using minimal schema for type generation only.`
  );
  console.log(`📁 Minimal schema path: ${minimalSchemaPath}`);
  console.log(`📁 Target schema path: ${schemaPath}`);

  // Check if minimal schema exists
  if (!fs.existsSync(minimalSchemaPath)) {
    console.error(`❌ Minimal schema file not found at: ${minimalSchemaPath}`);
    process.exit(1);
  }

  // Copy minimal schema to schema.prisma for type generation
  try {
    fs.copyFileSync(minimalSchemaPath, schemaPath);
    console.log("✅ Copied minimal schema for type generation");

    // Verify the copy worked
    if (fs.existsSync(schemaPath)) {
      console.log("✅ Schema file exists after copy");
    } else {
      console.error("❌ Schema file does not exist after copy");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Failed to copy minimal schema:", error.message);
    process.exit(1);
  }
} else {
  console.log(
    "✅ DATABASE_URL found and not in Railway, building full schema..."
  );
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
