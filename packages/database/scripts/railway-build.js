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
if (!databaseUrl) {
  console.log("⚠️  DATABASE_URL not found, using placeholder for build...");

  // Create a temporary schema with models that your code expects
  const tempSchema = `// Temporary schema for Railway build
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearchPostgres"]
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://placeholder:placeholder@localhost:5432/placeholder"
}

// Models that your code expects
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  notes     Note[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Note {
  id        String   @id @default(cuid())
  title     String
  content   String?
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`;

  const schemaPath = path.join(__dirname, "..", "schema.prisma");
  fs.writeFileSync(schemaPath, tempSchema);
  console.log("✅ Created temporary schema for build");
} else {
  console.log("✅ DATABASE_URL found, building full schema...");
  // Run the normal build schema script
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
  execSync("tsc", {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });
  console.log("✅ TypeScript compilation successful");
} catch (error) {
  console.error("❌ TypeScript compilation failed:", error.message);
  process.exit(1);
}

console.log("🎉 Railway build completed successfully!");
