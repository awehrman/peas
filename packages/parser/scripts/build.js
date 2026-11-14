#!/usr/bin/env node
import { generateV2Parser } from "./generate-v2.js";

import { execSync } from "child_process";
import fs from "fs";

console.log("Cleaning dist directory...");
if (fs.existsSync("dist")) {
  fs.rmSync("dist", { recursive: true });
}

console.log("Generating v2 grammar...");
generateV2Parser();

console.log("Compiling v2...");
execSync("npx tsc -p tsconfig.build.json", {
  stdio: "inherit",
});

console.log("Build completed successfully!");
