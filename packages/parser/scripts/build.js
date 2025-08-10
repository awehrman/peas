#!/usr/bin/env node
import { execSync } from "child_process";
import fs from "fs";

// Clean and create dist directories
console.log("Cleaning dist directory...");
if (fs.existsSync("dist")) {
  fs.rmSync("dist", { recursive: true });
}
fs.mkdirSync("dist/v1", { recursive: true });
fs.mkdirSync("dist/v2", { recursive: true });

// Build v1 parser
console.log("Building v1 parser...");
execSync("peggy -o dist/v1/parser.js --format es src/v1/parser.peggy", {
  stdio: "inherit",
});

// Build v2 parser
console.log("Building v2 parser...");
execSync("peggy -o dist/v2/grammar.js --format es src/v2/grammar.peggy", {
  stdio: "inherit",
});

// Create index files for each version
console.log("Creating index files...");

// V1 index
const v1Index = `// V1 Parser
export { parse } from './parser.js';
`;
fs.writeFileSync("dist/v1/index.js", v1Index);

// V2 index
const v2Index = `// V2 Parser
export { parse } from './grammar.js';
`;
fs.writeFileSync("dist/v2/index.js", v2Index);

// Main index
const mainIndex = `// Main entry point that exports both parser versions
export * as v1 from './v1/index.js';
export * as v2 from './v2/index.js';

// Default export uses v2 (latest version)
export * from './v2/index.js';
`;
fs.writeFileSync("dist/index.js", mainIndex);

// Minify both versions
console.log("Minifying v1 parser...");
execSync(
  "npx terser dist/v1/index.js --compress --mangle -o dist/v1/index.min.js",
  {
    stdio: "inherit",
  }
);

console.log("Minifying v2 parser...");
execSync(
  "npx terser dist/v2/index.js --compress --mangle -o dist/v2/index.min.js",
  {
    stdio: "inherit",
  }
);

console.log("Build completed successfully!");
