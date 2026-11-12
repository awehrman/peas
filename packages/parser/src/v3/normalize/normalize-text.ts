import type { TextSpan } from "../ast/types.js";
import { NORMALIZER_VERSION } from "../version.js";

import { FRACTION_SLASHES, VULGAR_FRACTIONS } from "./fractions.js";

export interface NormalizedText {
  raw: string;
  text: string;
  version: string;
  /** Maps a half-open span in `text` to the raw span that produced it. */
  toRawSpan(start: number, end: number): TextSpan;
}

const DASHES = /[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/;
const DOUBLE_QUOTES = /[\u201C\u201D\u201E\u201F\u2033\u00AB\u00BB]/;
const SINGLE_QUOTES = /[\u2018\u2019\u201A\u201B\u2032\u0060\u00B4]/;
const WHITESPACE = /\s/;

function replacementFor(char: string, previousOutput: string): string {
  const fraction = VULGAR_FRACTIONS[char];
  if (fraction) {
    // "1½" reads as "1 1/2"
    return /\d$/.test(previousOutput) ? ` ${fraction}` : fraction;
  }
  if (FRACTION_SLASHES.has(char)) return "/";
  if (DASHES.test(char)) return "-";
  if (DOUBLE_QUOTES.test(char)) return '"';
  if (SINGLE_QUOTES.test(char)) return "'";
  if (char === "\u00D7") return "x";
  if (WHITESPACE.test(char)) return " ";
  return char.normalize("NFKC");
}

/**
 * Deterministic, non-destructive normalization: Unicode compatibility forms,
 * vulgar fractions, dash, quote, and space variants. Case, hyphens, and words
 * are preserved; every output character remembers the raw characters it came
 * from so spans can be mapped back.
 */
export function normalizeText(raw: string): NormalizedText {
  let text = "";
  const rawStarts: number[] = [];
  const rawEnds: number[] = [];

  let index = 0;
  for (const char of raw) {
    const rawStart = index;
    const rawEnd = index + char.length;
    index = rawEnd;

    const replacement = replacementFor(char, text);
    for (const outputChar of replacement) {
      const isSpace = outputChar === " ";
      // Collapse runs of whitespace and drop leading whitespace
      if (isSpace && (text.length === 0 || text.endsWith(" "))) continue;
      text += outputChar;
      for (let i = 0; i < outputChar.length; i++) {
        rawStarts.push(rawStart);
        rawEnds.push(rawEnd);
      }
    }
  }

  while (text.endsWith(" ")) {
    text = text.slice(0, -1);
    rawStarts.pop();
    rawEnds.pop();
  }

  return {
    raw,
    text,
    version: NORMALIZER_VERSION,
    toRawSpan(start, end) {
      if (start >= end || text.length === 0) {
        const position =
          start < rawStarts.length
            ? (rawStarts[start] ?? raw.length)
            : (rawEnds[rawEnds.length - 1] ?? raw.length);
        return { start: position, end: position, text: "" };
      }
      const rawStart = rawStarts[start] ?? raw.length;
      const rawEnd = rawEnds[Math.min(end, rawEnds.length) - 1] ?? raw.length;
      return { start: rawStart, end: rawEnd, text: raw.slice(rawStart, rawEnd) };
    },
  };
}
