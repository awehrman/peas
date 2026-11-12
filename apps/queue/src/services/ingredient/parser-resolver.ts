import { getActiveParserConfig } from "@peas/database";
import {
  type NormalizedParseResult,
  buildParser,
  normalizeParseResult,
} from "@peas/parser/dynamic";

import type { StructuredLogger } from "../../types";
import { LogLevel } from "../../types";

export const STATIC_V1_PARSER_ID = "static_v1";

/** How long the active-parser setting is trusted before re-reading it. */
export const PARSER_SETTINGS_TTL_MS = 15_000;

export interface ResolvedIngredientParser {
  /** "static_v1" or "grammar:<versionId>"; stored on each parsed line */
  id: string;
  parse: (line: string) => NormalizedParseResult;
}

let cachedResolution: { parser: ResolvedIngredientParser; expiresAt: number } | null = null;
const parsersByGrammarHash = new Map<string, ResolvedIngredientParser>();

function log(logger: StructuredLogger | undefined, message: string, level = LogLevel.INFO) {
  if (logger) logger.log(`[PARSER_RESOLVER] ${message}`, level);
  else if (level === LogLevel.ERROR || level === LogLevel.WARN) console.warn(`[PARSER_RESOLVER] ${message}`);
}

async function getStaticV1Parser(): Promise<ResolvedIngredientParser> {
  const { parse } = await import("@peas/parser/v1/minified");
  return {
    id: STATIC_V1_PARSER_ID,
    parse: (line) => normalizeParseResult(parse(line)),
  };
}

function getDatabaseParser(
  version: { id: string; hash: string; source: string },
  logger?: StructuredLogger
): ResolvedIngredientParser | null {
  const existing = parsersByGrammarHash.get(version.hash);
  if (existing) return existing;

  const built = buildParser(version.source);
  if (!built.ok) {
    log(
      logger,
      `Published grammar ${version.id} does not compile (${built.errors
        .map((error) => error.message)
        .join("; ")}); falling back to static v1`,
      LogLevel.ERROR
    );
    return null;
  }

  const parser: ResolvedIngredientParser = {
    id: `grammar:${version.id}`,
    parse: built.parser.parse,
  };
  parsersByGrammarHash.set(version.hash, parser);
  return parser;
}

/**
 * Returns the parser the import queue should use for ingredient lines,
 * based on the admin's parser switch. Falls back to the static v1 grammar
 * whenever the setting can't be read or the published grammar won't build.
 */
export async function resolveIngredientParser(
  logger?: StructuredLogger
): Promise<ResolvedIngredientParser> {
  const now = Date.now();
  if (cachedResolution && cachedResolution.expiresAt > now) {
    return cachedResolution.parser;
  }

  let parser: ResolvedIngredientParser | null = null;

  try {
    const config = await getActiveParserConfig();
    if (config.activeParser === "DATABASE") {
      if (config.grammarVersion) {
        parser = getDatabaseParser(config.grammarVersion, logger);
      } else {
        log(logger, "Database parser selected without a published grammar; using static v1", LogLevel.WARN);
      }
    }
  } catch (error) {
    log(logger, `Could not read parser settings (${String(error)}); using static v1`, LogLevel.ERROR);
  }

  const resolved = parser ?? (await getStaticV1Parser());
  cachedResolution = { parser: resolved, expiresAt: now + PARSER_SETTINGS_TTL_MS };
  return resolved;
}

/** Clears cached settings and built grammars (tests and cache resets). */
export function resetParserResolver(): void {
  cachedResolution = null;
  parsersByGrammarHash.clear();
}
