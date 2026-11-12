#!/usr/bin/env node
import { execSync } from "child_process";
import fs from "fs";

import { generateV3Parser } from "./generate-v3.js";

// Clean and create dist directories
console.log("Cleaning dist directory...");
if (fs.existsSync("dist")) {
  fs.rmSync("dist", { recursive: true });
}
fs.mkdirSync("dist/v1", { recursive: true });

// Build v1 parser (the live import parser until v3 replaces it)
console.log("Building v1 parser...");
execSync("peggy -o dist/v1/parser.js --format es src/v1/parser.peggy", {
  stdio: "inherit",
});

const v1Index = `// V1 Parser
export { parse } from './parser.js';
`;
fs.writeFileSync("dist/v1/index.js", v1Index);

const mainIndex = `// Main entry point: the v1 parser
export * as v1 from './v1/index.js';
export * from './v1/index.js';
`;
fs.writeFileSync("dist/index.js", mainIndex);

console.log("Minifying v1 parser...");
execSync(
  "npx terser dist/v1/index.js --compress --mangle -o dist/v1/index.min.js",
  {
    stdio: "inherit",
  }
);

// v3: generate the grammar, then compile the TypeScript sources
console.log("Generating v3 grammar...");
generateV3Parser();

console.log("Compiling v3...");
execSync("npx tsc -p tsconfig.build.json", {
  stdio: "inherit",
});

console.log("Build completed successfully!");
