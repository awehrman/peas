import type { ContentBlock } from "./types.js";

/** Lines shorter than this (after trimming) are dropped, as the importer does. */
export const MIN_LINE_LENGTH = 3;
/** A line on its own must be at least this long to be filed as an instruction. */
export const MIN_INSTRUCTION_LENGTH = 10;

const CONTENT_SEPARATOR = "\n";

function isEmptyLine(line: string): boolean {
  return line === "" || line.includes("<br");
}

/**
 * Splits stored note content (`Note.html`, which holds the extracted lines joined by newlines) back into lines, blank lines included.
 *
 * @example
 * splitStoredContent("\n2 eggs\n1 cup milk\n\nWhisk.") // ["", "2 eggs", "1 cup milk", "", "Whisk."]
 */
export function splitStoredContent(content: string): string[] {
  return content.split(CONTENT_SEPARATOR);
}

/**
 * Files each line of extracted note content the way the importer's DOM rules do, keeping where each line came from: a non-empty line between two blank lines (at least 10 characters, and not the first non-empty line) is an instruction; every other run of lines is an ingredient block. Lines under 3 characters are dropped. The block and line numbers match `ParsedIngredientLine (blockIndex, lineIndex)` and `ParsedInstructionLine.lineIndex`.
 *
 * @example
 * segmentContent(["2 eggs", "1 cup milk", "", "Whisk everything together.", ""])
 * // [
 * //   { assigned: "INGREDIENT", contentIndex: 0, text: "2 eggs", blockIndex: 0, lineIndex: 0 },
 * //   { assigned: "INGREDIENT", contentIndex: 1, text: "1 cup milk", blockIndex: 0, lineIndex: 1 },
 * //   { assigned: "INSTRUCTION", contentIndex: 3, text: "Whisk everything together.", lineIndex: 0 },
 * // ]
 */
export function segmentContent(lines: readonly string[]): ContentBlock[] {
  const firstNonEmpty = lines.findIndex((line) => !isEmptyLine(line));
  const blocks: ContentBlock[] = [];
  let chunk: { contentIndex: number; text: string }[] = [];
  let ingredientBlockCount = 0;
  let instructionCount = 0;

  const flush = () => {
    if (chunk.length === 0) return;
    for (const [lineIndex, item] of chunk.entries()) {
      blocks.push({
        assigned: "INGREDIENT",
        contentIndex: item.contentIndex,
        text: item.text,
        blockIndex: ingredientBlockCount,
        lineIndex,
      });
    }
    ingredientBlockCount += 1;
    chunk = [];
  };

  for (const [contentIndex, line] of lines.entries()) {
    if (isEmptyLine(line)) {
      flush();
      continue;
    }
    const text = line.trim();
    if (text.length < MIN_LINE_LENGTH) continue;

    const standsAlone =
      contentIndex !== firstNonEmpty &&
      isEmptyLine(lines[contentIndex - 1] ?? "") &&
      isEmptyLine(lines[contentIndex + 1] ?? "");
    if (standsAlone && text.length >= MIN_INSTRUCTION_LENGTH) {
      blocks.push({
        assigned: "INSTRUCTION",
        contentIndex,
        text,
        lineIndex: instructionCount,
      });
      instructionCount += 1;
    } else {
      chunk.push({ contentIndex, text });
    }
  }
  flush();

  return blocks.sort((a, b) => a.contentIndex - b.contentIndex);
}
