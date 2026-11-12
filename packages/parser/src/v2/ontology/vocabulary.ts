/**
 * The starting vocabulary that `yarn workspace @peas/database db:seed:ontology` writes (attribute dimensions and preparation operations), plus the value keys for DEGREE, MEASUREMENT_MODIFIER, and INSTRUCTION entries, which have no table of their own. Lexicon entries that spell these ("finely", "heaping") arrive in Phase 3 from the reviewed v1 descriptor seed.
 */

export interface VocabularyValue {
  key: string;
  label: string;
}

export interface AttributeDimension {
  key: string;
  name: string;
  values: readonly VocabularyValue[];
}

/**
 * @example
 * // "boneless skinless chicken thighs" -> bone=boneless, skin=skinless
 * // "green apples" -> color=green (or ripeness=unripe; a reviewer decides)
 */
export const ATTRIBUTE_DIMENSIONS: readonly AttributeDimension[] = [
  {
    key: "color",
    name: "Color",
    values: [
      { key: "black", label: "Black" },
      { key: "brown", label: "Brown" },
      { key: "green", label: "Green" },
      { key: "orange", label: "Orange" },
      { key: "purple", label: "Purple" },
      { key: "red", label: "Red" },
      { key: "white", label: "White" },
      { key: "yellow", label: "Yellow" },
    ],
  },
  {
    key: "fat_content",
    name: "Fat content",
    values: [
      { key: "whole", label: "Whole" },
      { key: "reduced_fat", label: "Reduced-fat" },
      { key: "low_fat", label: "Low-fat" },
      { key: "nonfat", label: "Nonfat" },
    ],
  },
  {
    key: "bone",
    name: "Bone",
    values: [
      { key: "bone_in", label: "Bone-in" },
      { key: "boneless", label: "Boneless" },
    ],
  },
  {
    key: "skin",
    name: "Skin",
    values: [
      { key: "skin_on", label: "Skin-on" },
      { key: "skinless", label: "Skinless" },
    ],
  },
  {
    key: "form",
    name: "Form",
    values: [
      { key: "whole", label: "Whole" },
      { key: "ground", label: "Ground" },
      { key: "powdered", label: "Powdered" },
      { key: "flaked", label: "Flaked" },
      { key: "crushed", label: "Crushed" },
    ],
  },
  {
    key: "preservation",
    name: "Preservation",
    values: [
      { key: "fresh", label: "Fresh" },
      { key: "dried", label: "Dried" },
      { key: "frozen", label: "Frozen" },
      { key: "canned", label: "Canned" },
      { key: "smoked", label: "Smoked" },
      { key: "pickled", label: "Pickled" },
      { key: "cured", label: "Cured" },
    ],
  },
  {
    key: "ripeness",
    name: "Ripeness",
    values: [
      { key: "unripe", label: "Unripe" },
      { key: "ripe", label: "Ripe" },
      { key: "overripe", label: "Overripe" },
    ],
  },
  {
    key: "sweetness",
    name: "Sweetness",
    values: [
      { key: "sweetened", label: "Sweetened" },
      { key: "unsweetened", label: "Unsweetened" },
      { key: "semisweet", label: "Semisweet" },
      { key: "bittersweet", label: "Bittersweet" },
    ],
  },
  {
    key: "size",
    name: "Size",
    values: [
      { key: "small", label: "Small" },
      { key: "medium", label: "Medium" },
      { key: "large", label: "Large" },
      { key: "extra_large", label: "Extra-large" },
      { key: "jumbo", label: "Jumbo" },
    ],
  },
  {
    key: "temperature",
    name: "Temperature",
    values: [
      { key: "cold", label: "Cold" },
      { key: "room_temperature", label: "Room temperature" },
      { key: "warm", label: "Warm" },
      { key: "hot", label: "Hot" },
    ],
  },
  {
    key: "salt_level",
    name: "Salt level",
    values: [
      { key: "salted", label: "Salted" },
      { key: "unsalted", label: "Unsalted" },
      { key: "low_sodium", label: "Low-sodium" },
    ],
  },
];

/**
 * @example
 * // "1 cup finely chopped parsley" -> chop (degree fine), "1 cup milk, warmed" -> warm
 */
export const PREPARATION_OPERATIONS: readonly VocabularyValue[] = [
  { key: "chop", label: "Chop" },
  { key: "dice", label: "Dice" },
  { key: "mince", label: "Mince" },
  { key: "slice", label: "Slice" },
  { key: "julienne", label: "Julienne" },
  { key: "grate", label: "Grate" },
  { key: "shred", label: "Shred" },
  { key: "peel", label: "Peel" },
  { key: "core", label: "Core" },
  { key: "seed", label: "Seed" },
  { key: "pit", label: "Pit" },
  { key: "trim", label: "Trim" },
  { key: "halve", label: "Halve" },
  { key: "quarter", label: "Quarter" },
  { key: "crush", label: "Crush" },
  { key: "mash", label: "Mash" },
  { key: "puree", label: "Purée" },
  { key: "drain", label: "Drain" },
  { key: "rinse", label: "Rinse" },
  { key: "toast", label: "Toast" },
  { key: "melt", label: "Melt" },
  { key: "soften", label: "Soften" },
  { key: "warm", label: "Warm" },
  { key: "chill", label: "Chill" },
  { key: "beat", label: "Beat" },
  { key: "sift", label: "Sift" },
  { key: "pack", label: "Pack" },
];

/** How intensely a preparation is done: "finely chopped" -> fine. */
export const DEGREE_KEYS = [
  "fine",
  "very_fine",
  "coarse",
  "rough",
  "thin",
  "thick",
  "light",
  "well",
] as const;

/** How a measure is filled: "1 heaping cup" -> heaping. */
export const MEASUREMENT_MODIFIER_KEYS = [
  "heaping",
  "level",
  "scant",
  "generous",
  "packed",
  "loosely_packed",
  "rounded",
] as const;

/** Directions that are not preparations: "olive oil, divided" -> divided. */
export const INSTRUCTION_KEYS = [
  "divided",
  "optional",
  "for_garnish",
  "for_serving",
  "plus_more",
  "reserved",
  "noise",
] as const;

/** INSTRUCTION value key for words a reviewer chose to ignore ("good-quality"): the resolver counts them as explained and leaves them out of the result. */
export const NOISE_VALUE_KEY =
  "noise" satisfies (typeof INSTRUCTION_KEYS)[number];

export type DegreeKey = (typeof DEGREE_KEYS)[number];
export type MeasurementModifierKey = (typeof MEASUREMENT_MODIFIER_KEYS)[number];
export type InstructionKey = (typeof INSTRUCTION_KEYS)[number];
