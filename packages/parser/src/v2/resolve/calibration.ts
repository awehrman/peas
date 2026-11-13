import { type ResolverSnapshot, buildResolverContext } from "./context.js";
import { processIngredientLine } from "./process-line.js";
import { conceptSlug } from "./report.js";
import { DEFAULT_SCORING_CONFIG, type ScoringConfig } from "./scoring.js";

/**
 * A labeled line: what the first mention should resolve to, by concept id or by canonical-name slug ("whole-milk"); null when it should stay unresolved.
 *
 * @example
 * { input: "1 cup whole milk", expected: "whole-milk", source: "semantic" }
 * { input: "2 tbsp icing sugar", expected: "0193...", source: "verified" }
 */
export interface CalibrationCase {
  input: string;
  expected: string | null;
  source: "semantic" | "verified";
}

export interface CalibrationGroup {
  snapshot: ResolverSnapshot;
  cases: readonly CalibrationCase[];
}

export interface CalibrationRow {
  minMargin: number;
  maxUnknownForAuto: number;
  cases: number;
  autoResolved: number;
  correct: number;
  /** correct / autoResolved; 1 when nothing was auto-resolved. */
  precision: number;
  /** autoResolved / cases. */
  coverage: number;
}

export interface CalibrationResult {
  targetPrecision: number;
  rows: CalibrationRow[];
  /** The most permissive row meeting the target (highest coverage). Among ties, the one closest to the current setting (fewest knobs changed, then the smallest change, then the stricter), so a knob that changes nothing stays put. Null when no row meets the target. */
  recommended: CalibrationRow | null;
  current: CalibrationRow | null;
  bySource: Record<string, number>;
}

export const DEFAULT_MIN_MARGINS = [0, 0.05, 0.1, 0.15, 0.2, 0.3] as const;
export const DEFAULT_MAX_UNKNOWNS = [0, 1, 2] as const;

/**
 * Measures auto-resolution precision and coverage over a grid of `minMargin` and `maxUnknownForAuto` values (Phase 6g) and recommends the most permissive setting whose precision stays at or above the target. A line counts as correct when its first mention is AUTO_RESOLVED to the expected concept; a line expected to stay unresolved counts as wrong if anything auto-resolves.
 *
 * @example
 * const result = calibrateThresholds([{ snapshot, cases }], { targetPrecision: 0.98 });
 * result.recommended // { minMargin: 0.15, maxUnknownForAuto: 1, precision: 1, coverage: 0.87, ... }
 */
export function calibrateThresholds(
  groups: readonly CalibrationGroup[],
  {
    targetPrecision = 0.98,
    minMargins = DEFAULT_MIN_MARGINS,
    maxUnknowns = DEFAULT_MAX_UNKNOWNS,
    base = DEFAULT_SCORING_CONFIG,
  }: {
    targetPrecision?: number;
    minMargins?: readonly number[];
    maxUnknowns?: readonly number[];
    base?: ScoringConfig;
  } = {}
): CalibrationResult {
  const bySource: Record<string, number> = {};
  for (const group of groups)
    for (const labeled of group.cases)
      bySource[labeled.source] = (bySource[labeled.source] ?? 0) + 1;

  const rows: CalibrationRow[] = [];
  for (const minMargin of minMargins) {
    for (const maxUnknownForAuto of maxUnknowns) {
      const config: ScoringConfig = { ...base, minMargin, maxUnknownForAuto };
      const row: CalibrationRow = {
        minMargin,
        maxUnknownForAuto,
        cases: 0,
        autoResolved: 0,
        correct: 0,
        precision: 1,
        coverage: 0,
      };
      for (const group of groups) {
        const context = buildResolverContext(group.snapshot, config);
        for (const labeled of group.cases) {
          row.cases += 1;
          const [mention] = processIngredientLine(
            labeled.input,
            context
          ).mentions;
          if (mention?.status !== "AUTO_RESOLVED") continue;
          row.autoResolved += 1;
          const conceptId = mention.resolution.candidates[0]?.conceptId;
          const concept = conceptId
            ? context.ontology.concept(conceptId)
            : undefined;
          if (
            labeled.expected !== null &&
            (conceptId === labeled.expected ||
              (concept &&
                conceptSlug(concept.canonicalName) === labeled.expected))
          )
            row.correct += 1;
        }
      }
      row.precision =
        row.autoResolved === 0 ? 1 : row.correct / row.autoResolved;
      row.coverage = row.cases === 0 ? 0 : row.autoResolved / row.cases;
      rows.push(row);
    }
  }

  const current =
    rows.find(
      (row) =>
        row.minMargin === base.minMargin &&
        row.maxUnknownForAuto === base.maxUnknownForAuto
    ) ?? null;
  const passing = rows.filter(
    (row) => row.autoResolved > 0 && row.precision >= targetPrecision
  );
  const bestCoverage = Math.max(...passing.map((row) => row.coverage));
  const best = passing.filter((row) => row.coverage === bestCoverage);
  const changedKnobs = (row: CalibrationRow) =>
    current
      ? Number(row.minMargin !== current.minMargin) +
        Number(row.maxUnknownForAuto !== current.maxUnknownForAuto)
      : 0;
  const distance = (row: CalibrationRow) =>
    current
      ? Math.abs(row.minMargin - current.minMargin) +
        Math.abs(row.maxUnknownForAuto - current.maxUnknownForAuto)
      : 0;
  const recommended =
    [...best].sort(
      (a, b) =>
        changedKnobs(a) - changedKnobs(b) ||
        distance(a) - distance(b) ||
        b.minMargin - a.minMargin ||
        a.maxUnknownForAuto - b.maxUnknownForAuto
    )[0] ?? null;
  return { targetPrecision, rows, recommended, current, bySource };
}

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

/**
 * The calibration result as markdown for `fixtures/reports/calibration.md`. Notes which knobs change nothing on these labels, so a setting is never "justified" by a column that cannot move.
 *
 * @example
 * writeFileSync("fixtures/reports/calibration.md", formatCalibrationReport(result, { resolverVersion: "1.0.0" }))
 */
export function formatCalibrationReport(
  result: CalibrationResult,
  { resolverVersion, sources }: { resolverVersion: string; sources: string }
): string {
  const sameAcross = (key: "minMargin" | "maxUnknownForAuto") => {
    const other = key === "minMargin" ? "maxUnknownForAuto" : "minMargin";
    const groups = new Map<number, string>();
    for (const row of result.rows) {
      const signature = `${row.autoResolved}/${row.correct}`;
      const previous = groups.get(row[other]);
      if (previous !== undefined && previous !== signature) return false;
      groups.set(row[other], signature);
    }
    return true;
  };
  const notes: string[] = [];
  if (sameAcross("minMargin"))
    notes.push(
      "`minMargin` changes nothing on these labels: the resolver only auto-resolves when a single candidate remains, so the margin over a runner-up never decides. It matters only if that rule is relaxed."
    );
  if (sameAcross("maxUnknownForAuto"))
    notes.push(
      "`maxUnknownForAuto` changes nothing on these labels: no labeled line has unknown words next to an otherwise resolvable food."
    );

  const describe = (row: CalibrationRow | null) =>
    row
      ? `minMargin ${row.minMargin}, maxUnknownForAuto ${row.maxUnknownForAuto} (precision ${pct(row.precision)}, coverage ${pct(row.coverage)}, ${row.correct}/${row.autoResolved} correct of ${row.cases})`
      : "none";
  const lines = [
    "# Automatic-resolution calibration",
    "",
    `Generated by \`yarn workspace @peas/parser calibrate:thresholds\` with resolver ${resolverVersion}. Labels: ${sources} (${Object.entries(
      result.bySource
    )
      .map(([source, count]) => `${count} ${source}`)
      .join(", ")}). Target precision ${pct(result.targetPrecision)}.`,
    "",
    `- Current setting: ${describe(result.current)}`,
    result.recommended && result.recommended === result.current
      ? "- Recommended: keep the current setting; nothing more permissive covers more lines at the target precision."
      : `- Recommended: ${describe(result.recommended)}`,
    ...notes.map((note) => `- ${note}`),
    "",
    "Changing `DEFAULT_SCORING_CONFIG` requires a `RESOLVER_VERSION` bump, followed by reinterpreting every unverified mention.",
    "",
    "| minMargin | maxUnknownForAuto | Auto-resolved | Correct | Precision | Coverage |",
    "| ---: | ---: | ---: | ---: | ---: | ---: |",
    ...result.rows.map(
      (row) =>
        `| ${row.minMargin} | ${row.maxUnknownForAuto} | ${row.autoResolved} | ${row.correct} | ${pct(row.precision)} | ${pct(row.coverage)} |`
    ),
  ];
  return `${lines.join("\n")}\n`;
}
