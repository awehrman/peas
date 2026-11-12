/**
 * Dry-run the note parser against an unzipped Evernote export, without
 * Redis, Postgres or the web app. Useful for checking an export before
 * uploading it.
 *
 *   yarn workspace @peas/queue preview-export ~/Desktop/venison-20240901
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { basename, join } from "path";

import { parseHTMLContent } from "../src/parsers/html";

function findHtmlFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) return findHtmlFiles(fullPath);
    return /\.html?$/i.test(entry) && !entry.includes("Evernote_index") ? [fullPath] : [];
  });
}

const root = process.argv[2];
if (!root) {
  console.error("Usage: preview-export <path to unzipped export>");
  process.exit(1);
}

const files = findHtmlFiles(root);
let failures = 0;

for (const file of files) {
  try {
    const parsed = parseHTMLContent(readFileSync(file, "utf8"), { logger: () => {} });
    const source = parsed.evernoteMetadata?.source ?? "";
    console.log(
      `✓ ${parsed.title || basename(file)}  ` +
        `(${parsed.ingredients.length} ingredient lines, ${parsed.instructions.length} instructions` +
        `${source ? `, source ${source}` : ""})`
    );
  } catch (error) {
    failures++;
    console.log(`✗ ${basename(file)}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(`\n${files.length - failures}/${files.length} notes parsed`);

// The parser's config imports open service connections that keep Node alive
process.exit(failures > 0 ? 1 : 0);
