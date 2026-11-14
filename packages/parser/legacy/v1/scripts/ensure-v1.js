import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const v1Dir = join(dirname(fileURLToPath(import.meta.url)), "..");
const v1ParserPath = join(v1Dir, "build/parser.js");

/** Reference only: compiles the retired v1 grammar into legacy/v1/build (git-ignored output, never published) when it has not been built yet; returns its path. */
export function ensureV1Parser() {
  if (!existsSync(v1ParserPath)) {
    execSync("npx peggy -o build/parser.js --format es parser.peggy", {
      cwd: v1Dir,
      stdio: "inherit",
    });
  }
  return v1ParserPath;
}
