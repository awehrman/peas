#!/usr/bin/env node

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🎨 Formatting schema files...");

try {
  // Format individual schema files
  console.log("  📝 Formatting individual schema files...");
  execSync("npx prisma format prisma/schemas/", {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  });

  // Format the generated schema file
  console.log("  📝 Formatting generated schema.prisma...");
  execSync("npx prisma format schema.prisma", {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  });

  console.log("\n✅ All schema files formatted successfully!");
} catch (error) {
  console.error("\n❌ Schema formatting failed:", error.message);
  process.exit(1);
}
