import peggy from "peggy";

import { normalizeParseResult } from "./normalize.js";
import type { BuildParserResult, GrammarCompileError } from "./types.js";

interface PeggyLocation {
  start: { line: number; column: number };
}

function toCompileError(message: string, location?: PeggyLocation): GrammarCompileError {
  return location
    ? { message, line: location.start.line, column: location.start.column }
    : { message };
}

function hasLocation(error: unknown): error is { message: string; location?: PeggyLocation } {
  return typeof error === "object" && error !== null && "message" in error;
}

/**
 * Compiles Peggy source into a parser whose output is normalized to flat
 * segments. Never throws; problems come back as `errors`.
 *
 * Formatter code in the grammar runs when the parser is generated and used,
 * so only build grammars from trusted (admin-edited) sources.
 */
export function buildParser(source: string): BuildParserResult {
  const errors: GrammarCompileError[] = [];
  const warnings: GrammarCompileError[] = [];

  try {
    const parser = peggy.generate(source, {
      output: "parser",
      cache: true,
      error: (_stage, message, location) => {
        errors.push(toCompileError(message, location));
      },
      warning: (_stage, message, location) => {
        warnings.push(toCompileError(message, location));
      },
    });

    return {
      ok: true,
      warnings,
      parser: {
        parse: (input: string) => normalizeParseResult(parser.parse(input)),
      },
    };
  } catch (error) {
    if (errors.length === 0) {
      errors.push(
        hasLocation(error)
          ? toCompileError(error.message, error.location)
          : { message: String(error) }
      );
    }
    return { ok: false, errors };
  }
}
