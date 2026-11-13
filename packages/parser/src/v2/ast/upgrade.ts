import { PARSER_VERSION } from "../version.js";

/**
 * Rewrites a stored syntax tree from major version `n` into the shape of major `n + 1`. Add an entry here whenever a major `PARSER_VERSION` bump changes the tree (and bump the Zod schemas with it); minor and patch bumps never change the shape.
 *
 * @example
 * // a hypothetical 3.0.0 that renamed `measurementModifiers` to `measureModifiers`:
 * // 2: (stored) => ({ ...stored, segment: renameKey(stored.segment, "measurementModifiers", "measureModifiers") })
 */
export const SYNTAX_UPGRADES: Readonly<
  Record<number, (stored: Record<string, unknown>) => Record<string, unknown>>
> = {};

/** The major number of a parser version, accepting job-style ids ("v2:2.1.0") too. */
export function parserMajor(version: string): number {
  const match = /(\d+)\.\d+\.\d+$/.exec(version);
  if (!match) throw new Error(`Not a parser version: "${version}"`);
  return Number(match[1]);
}

/**
 * Brings a stored syntax tree (a mention's `syntax`) written by `storedVersion` up to the current parser's shape, applying one upgrade per major version. Validate the result with the current Zod schema. Throws for trees from a newer parser, or from an older major with no upgrade path.
 *
 * @example
 * upgradeStoredSyntax(row.syntax, "2.0.0") // returned as is: 2.1.0 only added structures
 * upgradeStoredSyntax(row.syntax, "4.0.0") // throws: written by a newer parser
 */
export function upgradeStoredSyntax(
  stored: unknown,
  storedVersion: string,
  {
    currentVersion = PARSER_VERSION,
    upgrades = SYNTAX_UPGRADES,
  }: {
    currentVersion?: string;
    upgrades?: Readonly<
      Record<number, (stored: Record<string, unknown>) => Record<string, unknown>>
    >;
  } = {}
): unknown {
  const from = parserMajor(storedVersion);
  const to = parserMajor(currentVersion);
  if (from > to)
    throw new Error(
      `Syntax from parser ${storedVersion} is newer than this parser (${currentVersion})`
    );
  let syntax = stored;
  for (let major = from; major < to; major += 1) {
    const upgrade = upgrades[major];
    if (!upgrade)
      throw new Error(
        `No syntax upgrade from parser major ${major} to ${major + 1}; reparse these lines instead`
      );
    if (typeof syntax !== "object" || syntax === null)
      throw new Error("Stored syntax is not an object");
    syntax = upgrade(syntax as Record<string, unknown>);
  }
  return syntax;
}
