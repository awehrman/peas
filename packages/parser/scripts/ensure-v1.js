import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const v1ParserPath = join(packageDir, "dist/v1/parser.js");

/** Compiles the v1 grammar into dist/v1 when it has not been built yet; returns its path. */
export function ensureV1Parser() {
  if (!existsSync(v1ParserPath)) {
    execSync("npx peggy -o dist/v1/parser.js --format es src/v1/parser.peggy", {
      cwd: packageDir,
      stdio: "inherit",
    });
  }
  return v1ParserPath;
}
