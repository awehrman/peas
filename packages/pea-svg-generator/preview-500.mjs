import { PeaGenerator } from "./compiled/generator.js";
import { writeFileSync } from "node:fs";
const count = 500;
const generator = new PeaGenerator({ width: 1800, height: 1300, margin: 23, peasPerRow: 25, useBlobs: true, count, seed: 20261112 });
const svg = generator.generate();
writeFileSync("preview-500.svg", svg);
console.log(`Generated ${count} peas: preview-500.svg`);
