import {
  STRUCTURE_CLASSIFIER_VERSION,
  type StructureFinding,
  proposalLabel,
  segmentContent,
  splitStoredContent,
  validateStructure,
} from "@peas/parser/v2";

import type { StructuredLogger } from "../../types";

const MAX_RECENT_FINDINGS = 25;
const MAX_TEXT_LENGTH = 120;

/**
 * One finding as the metrics endpoint shows it.
 *
 * @example
 * { title: "Weeknight Chili", text: "For the sauce:", assigned: "INGREDIENT", proposed: "SECTION_HEADING", margin: 8 }
 */
export interface ShadowFindingSample {
  at: string;
  title: string | null;
  contentIndex: number;
  text: string;
  assigned: string;
  proposed: string;
  margin: number;
}

/**
 * What shadow validation has seen since this queue process started (Phase 8.5-B). Nothing it finds changes an import.
 *
 * @example
 * { classifierVersion: "1.0.0", notes: 40, blocks: 912, notesWithFindings: 6, findings: 9, byProposal: { "SECTION_HEADING": 5, "INSTRUCTION": 3, "SECTION_HEADING+INSTRUCTION": 1 }, failures: 0, recent: [...] }
 */
export interface StructureShadowSummary {
  classifierVersion: string;
  notes: number;
  blocks: number;
  notesWithFindings: number;
  findings: number;
  byProposal: Record<string, number>;
  failures: number;
  recent: ShadowFindingSample[];
}

/**
 * Running totals for shadow validation, kept in memory per process like the ingredient metrics.
 *
 * @example
 * const metrics = createStructureShadowMetrics();
 * metrics.record({ title: "Chili", blocks: 20, findings: [finding] });
 * metrics.summary().findings // 1
 */
export function createStructureShadowMetrics({
  now = () => new Date(),
}: { now?: () => Date } = {}) {
  let notes = 0;
  let blocks = 0;
  let notesWithFindings = 0;
  let failures = 0;
  const byProposal = new Map<string, number>();
  let recent: ShadowFindingSample[] = [];

  return {
    record({
      title,
      blocks: blockCount,
      findings,
    }: {
      title: string | null;
      blocks: number;
      findings: readonly StructureFinding[];
    }): void {
      notes += 1;
      blocks += blockCount;
      if (findings.length > 0) notesWithFindings += 1;
      const at = now().toISOString();
      for (const finding of findings) {
        const proposed = proposalLabel(finding.proposal);
        byProposal.set(proposed, (byProposal.get(proposed) ?? 0) + 1);
        recent.push({
          at,
          title,
          contentIndex: finding.contentIndex,
          text: finding.text.slice(0, MAX_TEXT_LENGTH),
          assigned: finding.assigned,
          proposed,
          margin: finding.margin,
        });
      }
      recent = recent.slice(-MAX_RECENT_FINDINGS);
    },

    recordFailure(): void {
      failures += 1;
    },

    summary(): StructureShadowSummary {
      return {
        classifierVersion: STRUCTURE_CLASSIFIER_VERSION,
        notes,
        blocks,
        notesWithFindings,
        findings: [...byProposal.values()].reduce(
          (sum, count) => sum + count,
          0
        ),
        byProposal: Object.fromEntries(byProposal),
        failures,
        recent: [...recent],
      };
    },
  };
}

export type StructureShadowMetrics = ReturnType<
  typeof createStructureShadowMetrics
>;

export const structureShadowMetrics = createStructureShadowMetrics();

/**
 * Validates one imported note's structure without changing anything: the importer's filing stands, and findings are only logged (`[STRUCTURE_SHADOW]`) and counted. Runs on structure alone, without the lexicon, so it adds no lookups to the parse step. Never throws.
 *
 * @example
 * runStructureShadow({ title: "Chili", contents: file.contents }, logger)
 * // logs "[STRUCTURE_SHADOW] Chili: 1 finding in 18 blocks (SECTION_HEADING 1)"
 */
export function runStructureShadow(
  { title, contents }: { title: string | null; contents: string },
  logger: StructuredLogger,
  metrics: StructureShadowMetrics = structureShadowMetrics
): StructureFinding[] {
  try {
    const blocks = segmentContent(splitStoredContent(contents));
    const { findings } = validateStructure(blocks);
    metrics.record({ title, blocks: blocks.length, findings });
    if (findings.length > 0) {
      const counts = new Map<string, number>();
      for (const finding of findings) {
        const label = proposalLabel(finding.proposal);
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      logger.log(
        `[STRUCTURE_SHADOW] ${title ?? "Untitled"}: ${findings.length} ${findings.length === 1 ? "finding" : "findings"} in ${blocks.length} blocks (${[...counts].map(([label, count]) => `${label} ${count}`).join(", ")})`
      );
    }
    return findings;
  } catch (error) {
    metrics.recordFailure();
    logger.log(`[STRUCTURE_SHADOW] Validation failed: ${error}`);
    return [];
  }
}
