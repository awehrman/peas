#!/usr/bin/env node

import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Schema files to validate (in order)
const schemaFiles = [
  "prisma/schemas/auth.prisma",
  "prisma/schemas/notes.prisma",
  "prisma/schemas/queue.prisma",
  "prisma/schemas/parsing.prisma",
  "prisma/schemas/meta.prisma",
  "prisma/schemas/source.prisma",
];

console.log("🔍 Validating individual schema files...");

let hasErrors = false;

schemaFiles.forEach((file) => {
  const filePath = path.join(__dirname, "..", file);
  if (fs.existsSync(filePath)) {
    try {
      console.log(`  ✅ Validating ${file}...`);
      execSync(`npx prisma validate --schema=${file}`, {
        stdio: "inherit",
        cwd: path.join(__dirname, ".."),
      });
    } catch (error) {
      console.error(`  ❌ Error validating ${file}:`, error.message);
      hasErrors = true;
    }
  } else {
    console.warn(`  ⚠️  Schema file ${file} not found`);
  }
});

if (hasErrors) {
  console.error("\n❌ Schema validation failed!");
  process.exit(1);
} else {
  console.log("\n✅ All schema files validated successfully!");
}
