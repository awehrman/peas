import {
  type BlockFeatureOptions,
  type BlockFeatures,
  blockFeatures,
  leadingHeading,
} from "./features.js";
import {
  bestKind,
  featureSignals,
  leadOf,
  signal,
  totalScores,
} from "./score.js";
import type {
  AssignedSection,
  BlockKind,
  BlockScores,
  BlockSignal,
  ContentBlock,
} from "./types.js";
import { STRUCTURE_CLASSIFIER_VERSION } from "./version.js";

/** How far another kind must lead the importer's section before a finding is raised. */
export const FINDING_MARGIN = 2;
/** A block whose own reading agrees with the importer by this much is settled: its neighbors cannot change it. */
export const SETTLED_LEAD = 3;

export interface SplitPart {
  kind: BlockKind;
  text: string;
  /** Offsets into the block's trimmed text, half-open. */
  start: number;
  end: number;
}

/**
 * What the validator proposes for a block: a different kind, or splitting a heading off the start of the line.
 *
 * @example
 * { type: "RECLASSIFY", kind: "SECTION_HEADING" }
 * { type: "SPLIT", parts: [{ kind: "SECTION_HEADING", text: "For the sauce:", ... }, { kind: "INSTRUCTION", text: "Combine all the ingredients.", ... }] }
 */
export type StructureProposal =
  | { type: "RECLASSIFY"; kind: BlockKind }
  | { type: "SPLIT"; parts: SplitPart[] };

/**
 * A block the importer probably misfiled, with the evidence.
 *
 * @example
 * {
 *   contentIndex: 4, text: "For the sauce:", assigned: "INGREDIENT",
 *   proposal: { type: "RECLASSIFY", kind: "SECTION_HEADING" }, margin: 6.5,
 *   signals: [{ id: "COLON_HEADING", kind: "SECTION_HEADING", weight: 4 }, ...],
 *   classifierVersion: "1.0.0",
 * }
 */
export interface StructureFinding {
  contentIndex: number;
  text: string;
  assigned: AssignedSection;
  proposal: StructureProposal;
  /** Points the proposal leads the importer's section by (for a split, the lead of the text after the heading). */
  margin: number;
  scores: BlockScores;
  signals: BlockSignal[];
  classifierVersion: string;
}

export interface BlockClassification {
  contentIndex: number;
  text: string;
  assigned: AssignedSection;
  /** The validator's reading: the proposal when there is a finding, otherwise the importer's section. */
  label: string;
  scores: BlockScores;
  signals: BlockSignal[];
  settled: boolean;
  finding: StructureFinding | null;
}

export interface StructureValidation {
  classifierVersion: string;
  blocks: BlockClassification[];
  findings: StructureFinding[];
}

/**
 * A readable label for a proposal: the kind, or the split parts joined with "+".
 *
 * @example
 * proposalLabel({ type: "RECLASSIFY", kind: "INSTRUCTION" }) // "INSTRUCTION"
 * proposalLabel({ type: "SPLIT", parts: [heading, instruction] }) // "SECTION_HEADING+INSTRUCTION"
 */
export function proposalLabel(proposal: StructureProposal): string {
  return proposal.type === "RECLASSIFY"
    ? proposal.kind
    : proposal.parts.map((part) => part.kind).join("+");
}

interface ScoredBlock {
  block: ContentBlock;
  features: BlockFeatures;
  own: BlockSignal[];
  baseScores: BlockScores;
  baseKind: BlockKind;
}

function scoreOwn(
  block: ContentBlock,
  options: BlockFeatureOptions
): ScoredBlock {
  const features = blockFeatures(block.text, options);
  const own = [
    ...featureSignals(features),
    signal("IMPORTER_SECTION", undefined, block.assigned),
  ];
  const baseScores = totalScores(own);
  return { block, features, own, baseScores, baseKind: bestKind(baseScores) };
}

function sameIngredientBlock(a: ContentBlock, b: ContentBlock): boolean {
  return (
    a.assigned === "INGREDIENT" &&
    b.assigned === "INGREDIENT" &&
    a.blockIndex === b.blockIndex
  );
}

/**
 * Neighbor evidence for a block whose own reading is uncertain: a short line with no amount that opens an ingredient block is probably its heading; a line between two ingredients that doesn't read as one leans heading too; a step-like line next to clear steps leans instruction.
 */
function contextSignals(
  scored: ScoredBlock,
  previous: ScoredBlock | undefined,
  next: ScoredBlock | undefined
): BlockSignal[] {
  const { block, features, baseKind } = scored;
  const signals: BlockSignal[] = [];
  const headingShaped =
    features.leadingQuantity === null &&
    features.leadingVerb === null &&
    features.wordCount <= 6 &&
    !features.unspecifiedAmount;

  if (
    headingShaped &&
    next &&
    sameIngredientBlock(block, next.block) &&
    next.features.leadingQuantity !== null &&
    next.baseKind === "INGREDIENT"
  )
    signals.push(signal("FOLLOWED_BY_INGREDIENTS"));

  if (
    headingShaped &&
    (baseKind === "INSTRUCTION" || baseKind === "UNKNOWN") &&
    previous?.baseKind === "INGREDIENT" &&
    next?.baseKind === "INGREDIENT"
  )
    signals.push(signal("BETWEEN_INGREDIENTS"));

  const isClearStep = (neighbor: ScoredBlock | undefined) =>
    neighbor?.baseKind === "INSTRUCTION" && leadOf(neighbor.baseScores) >= 2;
  if (
    block.assigned === "INGREDIENT" &&
    (baseKind === "INSTRUCTION" || baseKind === "UNKNOWN") &&
    (isClearStep(previous) || isClearStep(next))
  )
    signals.push(signal("NEXT_TO_INSTRUCTIONS"));

  return signals;
}

function splitFinding(
  scored: ScoredBlock,
  options: BlockFeatureOptions
): StructureFinding | null {
  if (scored.features.noteMarker) return null;
  const glued = leadingHeading(scored.block.text);
  if (!glued) return null;
  const restSignals = featureSignals(blockFeatures(glued.rest, options));
  const restScores = totalScores(restSignals);
  const restKind = bestKind(restScores);
  if (restKind !== "INSTRUCTION" && restKind !== "INGREDIENT") return null;

  const text = scored.block.text;
  return {
    contentIndex: scored.block.contentIndex,
    text,
    assigned: scored.block.assigned,
    proposal: {
      type: "SPLIT",
      parts: [
        {
          kind: "SECTION_HEADING",
          text: glued.heading,
          start: 0,
          end: glued.heading.length,
        },
        {
          kind: restKind,
          text: glued.rest,
          start: glued.restStart,
          end: text.length,
        },
      ],
    },
    margin: leadOf(restScores),
    scores: restScores,
    signals: [signal("COLON_HEADING", glued.heading), ...restSignals],
    classifierVersion: STRUCTURE_CLASSIFIER_VERSION,
  };
}

/**
 * Checks the importer's filing of every block in one note and proposes corrections only where the evidence clearly disagrees. Each block is scored on its own (with a one-point lean toward the importer's section, so ties keep the importer's choice); uncertain blocks then take evidence from their neighbors. Blocks the importer filed correctly produce no finding.
 *
 * @example
 * const blocks = segmentContent(["For the sauce:", "2 tbsp butter", "1 cup cream"]);
 * validateStructure(blocks).findings
 * // [{ contentIndex: 0, text: "For the sauce:", assigned: "INGREDIENT", proposal: { type: "RECLASSIFY", kind: "SECTION_HEADING" }, ... }]
 */
export function validateStructure(
  blocks: readonly ContentBlock[],
  options: BlockFeatureOptions = {}
): StructureValidation {
  const scored = blocks.map((block) => scoreOwn(block, options));

  const classified = scored.map((current, index): BlockClassification => {
    const { block } = current;
    const settled =
      current.baseKind === block.assigned &&
      leadOf(current.baseScores) >= SETTLED_LEAD;
    const signals = settled
      ? current.own
      : [
          ...current.own,
          ...contextSignals(current, scored[index - 1], scored[index + 1]),
        ];
    const scores = totalScores(signals);
    const kind = bestKind(scores);
    const margin =
      kind === "UNKNOWN" ? 0 : scores[kind] - scores[block.assigned];

    const finding =
      splitFinding(current, options) ??
      (kind !== "UNKNOWN" && kind !== block.assigned && margin >= FINDING_MARGIN
        ? {
            contentIndex: block.contentIndex,
            text: block.text,
            assigned: block.assigned,
            proposal: { type: "RECLASSIFY" as const, kind },
            margin,
            scores,
            signals,
            classifierVersion: STRUCTURE_CLASSIFIER_VERSION,
          }
        : null);

    return {
      contentIndex: block.contentIndex,
      text: block.text,
      assigned: block.assigned,
      label: finding ? proposalLabel(finding.proposal) : block.assigned,
      scores,
      signals,
      settled,
      finding,
    };
  });

  return {
    classifierVersion: STRUCTURE_CLASSIFIER_VERSION,
    blocks: classified,
    findings: classified.flatMap((block) =>
      block.finding ? [block.finding] : []
    ),
  };
}

/**
 * Scores one line on its own, for the playground and tests. Pass `assigned` to include the importer's lean.
 *
 * @example
 * classifyLine("Cook for 20 minutes").kind // "INSTRUCTION"
 * classifyLine("Salt and pepper to taste").kind // "INGREDIENT"
 */
export function classifyLine(
  text: string,
  {
    assigned,
    ...options
  }: BlockFeatureOptions & { assigned?: AssignedSection } = {}
): { kind: BlockKind; scores: BlockScores; signals: BlockSignal[] } {
  const signals = [
    ...featureSignals(blockFeatures(text, options)),
    ...(assigned ? [signal("IMPORTER_SECTION", undefined, assigned)] : []),
  ];
  const scores = totalScores(signals);
  return { kind: bestKind(scores), scores, signals };
}
