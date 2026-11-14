/**
 * Writes the pea strips used in the root README to docs/assets/peas. Seeded, so
 * re-running gives the same peas until the generator changes.
 *
 * Usage:
 *   yarn workspace @peas/pea-svg-generator generate:readme
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PeaGenerator } from "../src/generator.js";
import type { PeaGeneratorOptions } from "../src/types.js";

const OUTPUT_DIRECTORY = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../docs/assets/peas"
);

const STRIPS: Record<string, PeaGeneratorOptions> = {
  "banner.svg": {
    width: 880,
    height: 104,
    margin: 14,
    count: 11,
    peasPerRow: 11,
    seed: 13,
  },
  "divider.svg": {
    width: 880,
    height: 40,
    margin: 6,
    count: 24,
    peasPerRow: 24,
    seed: 1114,
  },
};

/** Two decimals is plenty on screen and keeps the files small enough to commit */
function roundNumbers(svg: string): string {
  return svg.replace(/-?\d+\.\d{3,}/g, (value) =>
    String(Number(Number(value).toFixed(2)))
  );
}

mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
for (const [fileName, options] of Object.entries(STRIPS)) {
  const svg = new PeaGenerator({ ...options, useBlobs: true }).generate();
  writeFileSync(join(OUTPUT_DIRECTORY, fileName), roundNumbers(svg) + "\n");
  console.log(`Wrote docs/assets/peas/${fileName}`);
}
