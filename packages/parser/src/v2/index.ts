export * from "./ast/types.js";
export * from "./ast/schemas.js";
export * from "./ast/upgrade.js";
export {
  describePhrase,
  describeQuantity,
  describeSegment,
  describeSyntax,
  phraseText,
} from "./debug/describe.js";
export {
  DEFAULT_SEGMENTATION_LIMIT,
  segmentations,
} from "./lexicon/segment.js";
export {
  buildLexicon,
  entryMatchKey,
  entryTokenKeys,
  type Lexicon,
} from "./lexicon/token-trie.js";
export * from "./ontology/types.js";
export * from "./ontology/inheritance.js";
export * from "./ontology/vocabulary.js";
export * from "./resolve/schemas.js";
export * from "./resolve/context.js";
export * from "./resolve/scoring.js";
export * from "./resolve/resolve-segment.js";
export * from "./resolve/process-line.js";
export * from "./resolve/report.js";
export * from "./resolve/calibration.js";
export { RESOLVER_VERSION } from "./resolve/version.js";
export * from "./knowledge/schemas.js";
export * from "./knowledge/priority.js";
export * from "./knowledge/plural.js";
export * from "./knowledge/discover.js";
export * from "./knowledge/structure-signature.js";
export * from "./knowledge/fixture-drafts.js";
export * from "./knowledge/apply-to-snapshot.js";
export * from "./lexicon/types.js";
export {
  LexiconEntryInputSchema,
  LexiconSnapshotSchema,
} from "./lexicon/schemas.js";
export {
  normalizeText,
  type NormalizedText,
} from "./normalize/normalize-text.js";
export {
  tokenize,
  tokenKey,
  type Token,
  type TokenKind,
} from "./normalize/tokenize.js";
export {
  parseLine,
  parseLineBest,
  type ParseLineOptions,
} from "./parse-line.js";
export * from "./preview/diff.js";
export {
  addRational,
  formatRational,
  multiplyRational,
  parseRational,
  rational,
  rationalToNumber,
} from "./quantity/rational.js";
export {
  createUnitMatcher,
  getUnitDefinition,
  UNIT_TABLE,
  type UnitDefinition,
  type UnitMatch,
  type UnitMatcher,
} from "./quantity/units.js";
export { NORMALIZER_VERSION, PARSER_VERSION } from "./version.js";
