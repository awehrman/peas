#!/usr/bin/env node

import { PeaGenerator } from "./generator.js";
import fs from "fs";

// Generate regular peas
console.log("Generating regular peas...");
const regularGenerator = new PeaGenerator({
  width: 1600,
  height: 900,
  peasPerRow: 6,
  margin: 140,
  outputPath: "generated-peas.svg",
  useBlobs: false,
});

const regularSvg = regularGenerator.generate();
fs.writeFileSync("generated-peas.svg", regularSvg);
console.log("✅ Regular peas generated: generated-peas.svg");

// Generate blob peas
console.log("Generating blob peas...");
const blobGenerator = new PeaGenerator({
  width: 1600,
  height: 900,
  peasPerRow: 6,
  margin: 140,
  outputPath: "generated-blob-peas.svg",
  useBlobs: true,
});

const blobSvg = blobGenerator.generate();
fs.writeFileSync("generated-blob-peas.svg", blobSvg);
console.log("✅ Blob peas generated: generated-blob-peas.svg");

console.log("🎉 All peas generated successfully!");
