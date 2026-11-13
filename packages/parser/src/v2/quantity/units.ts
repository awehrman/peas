import type { UnitDimension } from "../ast/types.js";

export interface UnitDefinition {
  id: string;
  dimension: UnitDimension;
  /** Case-insensitive spellings, singular and plural. */
  aliases: string[];
  /** Spellings whose case matters ("T" is a tablespoon, "t" a teaspoon). */
  caseSensitiveAliases?: string[];
  /** Abbreviations that may be followed by a period ("tbsp."). */
  abbreviations?: string[];
}

function withPlural(singular: string, plural = `${singular}s`): string[] {
  return [singular, plural];
}

/**
 * Units are structural vocabulary: a closed set whose dimension matters for
 * conversion. Words that name a food part ("thigh", "zest", "leaves") belong
 * in the lexicon, not here.
 */
export const UNIT_TABLE: UnitDefinition[] = [
  // Mass
  {
    id: "g",
    dimension: "MASS",
    aliases: [...withPlural("gram"), ...withPlural("gramme"), "g", "gr", "grs", "gm", "gms"],
    abbreviations: ["g", "gr", "grs", "gm", "gms"],
  },
  {
    id: "kg",
    dimension: "MASS",
    aliases: [...withPlural("kilogram"), ...withPlural("kilogramme"), ...withPlural("kilo"), "kg", "kgs", "㎏"],
    abbreviations: ["kg", "kgs"],
  },
  {
    id: "mg",
    dimension: "MASS",
    aliases: [...withPlural("milligram"), "mg", "mgs"],
    abbreviations: ["mg", "mgs"],
  },
  {
    id: "oz",
    dimension: "MASS",
    aliases: [...withPlural("ounce"), "oz", "ozs", "wt oz"],
    abbreviations: ["oz", "ozs", "wt oz"],
  },
  {
    id: "lb",
    dimension: "MASS",
    aliases: [...withPlural("pound"), "lb", "lbs"],
    abbreviations: ["lb", "lbs"],
  },

  // Volume
  {
    id: "ml",
    dimension: "VOLUME",
    aliases: [...withPlural("milliliter"), ...withPlural("millilitre"), "ml", "mls"],
    abbreviations: ["ml", "mls"],
  },
  {
    id: "cl",
    dimension: "VOLUME",
    aliases: [...withPlural("centiliter"), ...withPlural("centilitre"), "cl"],
    abbreviations: ["cl"],
  },
  {
    id: "dl",
    dimension: "VOLUME",
    aliases: [...withPlural("deciliter"), ...withPlural("decilitre"), "dl"],
    abbreviations: ["dl"],
  },
  {
    id: "l",
    dimension: "VOLUME",
    aliases: [...withPlural("liter"), ...withPlural("litre"), "ltr", "ltrs", "lt", "l"],
    abbreviations: ["ltr", "ltrs", "lt", "l"],
  },
  {
    id: "tsp",
    dimension: "VOLUME",
    aliases: [...withPlural("teaspoon"), ...withPlural("teaspoonful"), "tsp", "tsps", "tspn"],
    caseSensitiveAliases: ["t", "ts"],
    abbreviations: ["tsp", "tsps", "tspn", "t", "ts"],
  },
  {
    id: "tbsp",
    dimension: "VOLUME",
    aliases: [
      ...withPlural("tablespoon"),
      ...withPlural("tablespoonful"),
      "tbsp",
      "tbsps",
      "tbs",
      "tbl",
      "tbls",
      "tblsp",
      "tblsps",
      "tbsn",
    ],
    caseSensitiveAliases: ["T", "Tb", "Tbl"],
    abbreviations: ["tbsp", "tbsps", "tbs", "tbl", "tbls", "tblsp", "tblsps", "tbsn", "T", "Tb", "Tbl"],
  },
  {
    id: "cup",
    dimension: "VOLUME",
    aliases: [...withPlural("cup"), "c"],
    abbreviations: ["c"],
  },
  {
    id: "fl_oz",
    dimension: "VOLUME",
    aliases: [...withPlural("fluid ounce"), "fl oz", "fl. oz", "fl ozs", "floz"],
    abbreviations: ["fl oz", "fl. oz", "fl ozs", "floz"],
  },
  {
    id: "pt",
    dimension: "VOLUME",
    aliases: [...withPlural("pint"), "pt", "pts"],
    abbreviations: ["pt", "pts"],
  },
  {
    id: "qt",
    dimension: "VOLUME",
    aliases: [...withPlural("quart"), "qt", "qts"],
    abbreviations: ["qt", "qts"],
  },
  {
    id: "gal",
    dimension: "VOLUME",
    aliases: [...withPlural("gallon"), "gal", "gals"],
    abbreviations: ["gal", "gals"],
  },
  { id: "pinch", dimension: "VOLUME", aliases: withPlural("pinch", "pinches") },
  { id: "dash", dimension: "VOLUME", aliases: withPlural("dash", "dashes") },
  { id: "splash", dimension: "VOLUME", aliases: withPlural("splash", "splashes") },
  { id: "drop", dimension: "VOLUME", aliases: withPlural("drop") },
  { id: "drizzle", dimension: "VOLUME", aliases: withPlural("drizzle") },
  { id: "sprinkle", dimension: "VOLUME", aliases: withPlural("sprinkle") },
  { id: "glug", dimension: "VOLUME", aliases: withPlural("glug") },
  { id: "handful", dimension: "VOLUME", aliases: withPlural("handful") },
  { id: "scoop", dimension: "VOLUME", aliases: withPlural("scoop") },

  // Count classifiers
  { id: "clove", dimension: "COUNT", aliases: withPlural("clove") },
  { id: "sprig", dimension: "COUNT", aliases: withPlural("sprig") },
  { id: "slice", dimension: "COUNT", aliases: withPlural("slice") },
  { id: "head", dimension: "COUNT", aliases: withPlural("head") },
  { id: "bunch", dimension: "COUNT", aliases: withPlural("bunch", "bunches") },
  { id: "stalk", dimension: "COUNT", aliases: withPlural("stalk") },
  { id: "stick", dimension: "COUNT", aliases: withPlural("stick") },
  {
    id: "piece",
    dimension: "COUNT",
    aliases: [...withPlural("piece"), "pc", "pcs"],
    abbreviations: ["pc", "pcs"],
  },
  { id: "rib", dimension: "COUNT", aliases: withPlural("rib") },
  { id: "ear", dimension: "COUNT", aliases: withPlural("ear") },
  { id: "bulb", dimension: "COUNT", aliases: withPlural("bulb") },
  { id: "sheet", dimension: "COUNT", aliases: withPlural("sheet") },
  { id: "strip", dimension: "COUNT", aliases: withPlural("strip") },
  { id: "wedge", dimension: "COUNT", aliases: withPlural("wedge") },
  { id: "cube", dimension: "COUNT", aliases: withPlural("cube") },
  { id: "knob", dimension: "COUNT", aliases: withPlural("knob") },
  { id: "dollop", dimension: "COUNT", aliases: withPlural("dollop") },
  { id: "dozen", dimension: "COUNT", aliases: withPlural("dozen") },
  { id: "rack", dimension: "COUNT", aliases: withPlural("rack") },
  { id: "slab", dimension: "COUNT", aliases: withPlural("slab") },
  // A batch of another recipe ("1 recipe pie dough", "1/2 recipe frosting")
  { id: "recipe", dimension: "COUNT", aliases: withPlural("recipe") },

  // Packages
  { id: "can", dimension: "PACKAGE", aliases: withPlural("can") },
  { id: "tin", dimension: "PACKAGE", aliases: withPlural("tin") },
  { id: "jar", dimension: "PACKAGE", aliases: withPlural("jar") },
  { id: "bottle", dimension: "PACKAGE", aliases: withPlural("bottle") },
  {
    id: "package",
    dimension: "PACKAGE",
    aliases: [...withPlural("package"), "pkg", "pkgs"],
    abbreviations: ["pkg", "pkgs"],
  },
  {
    id: "packet",
    dimension: "PACKAGE",
    aliases: [...withPlural("packet"), "pkt", "pkts"],
    abbreviations: ["pkt", "pkts"],
  },
  { id: "pack", dimension: "PACKAGE", aliases: withPlural("pack") },
  { id: "box", dimension: "PACKAGE", aliases: withPlural("box", "boxes") },
  { id: "bag", dimension: "PACKAGE", aliases: withPlural("bag") },
  { id: "carton", dimension: "PACKAGE", aliases: withPlural("carton") },
  { id: "container", dimension: "PACKAGE", aliases: withPlural("container") },
  { id: "pouch", dimension: "PACKAGE", aliases: withPlural("pouch", "pouches") },
  { id: "envelope", dimension: "PACKAGE", aliases: withPlural("envelope") },
  { id: "sachet", dimension: "PACKAGE", aliases: withPlural("sachet") },
  { id: "tub", dimension: "PACKAGE", aliases: withPlural("tub") },
  { id: "block", dimension: "PACKAGE", aliases: withPlural("block") },
  { id: "bar", dimension: "PACKAGE", aliases: withPlural("bar") },
  { id: "loaf", dimension: "PACKAGE", aliases: withPlural("loaf", "loaves") },
  { id: "sleeve", dimension: "PACKAGE", aliases: withPlural("sleeve") },
  { id: "punnet", dimension: "PACKAGE", aliases: withPlural("punnet") },

  // Length
  {
    id: "in",
    dimension: "LENGTH",
    aliases: [...withPlural("inch", "inches"), "in", '"'],
    abbreviations: ["in"],
  },
  {
    id: "cm",
    dimension: "LENGTH",
    aliases: [...withPlural("centimeter"), ...withPlural("centimetre"), "cm"],
    abbreviations: ["cm"],
  },
  {
    id: "mm",
    dimension: "LENGTH",
    aliases: [...withPlural("millimeter"), ...withPlural("millimetre"), "mm"],
    abbreviations: ["mm"],
  },
];

export interface UnitMatch {
  id: string;
  dimension: UnitDimension;
  /** Number of characters consumed, including a trailing abbreviation period. */
  length: number;
}

interface AliasEntry {
  text: string;
  caseSensitive: boolean;
  abbreviation: boolean;
  unit: UnitDefinition;
}

const ALIASES: AliasEntry[] = UNIT_TABLE.flatMap((unit) => {
  const abbreviations = new Set(unit.abbreviations ?? []);
  return [
    ...unit.aliases.map((alias) => ({
      text: alias.toLowerCase(),
      caseSensitive: false,
      abbreviation: abbreviations.has(alias),
      unit,
    })),
    ...(unit.caseSensitiveAliases ?? []).map((alias) => ({
      text: alias,
      caseSensitive: true,
      abbreviation: abbreviations.has(alias),
      unit,
    })),
  ];
}).sort((a, b) => b.text.length - a.text.length);

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

function isLetterOrDigit(char: string | undefined): boolean {
  return char !== undefined && LETTER_OR_DIGIT.test(char);
}

function isLetter(char: string | undefined): boolean {
  return char !== undefined && /\p{L}/u.test(char);
}

export interface UnitMatcher {
  matchAt(offset: number): UnitMatch | null;
}

/**
 * Finds the longest unit spelled at `offset` in normalized text. A unit must
 * start a word (it may follow a digit, as in "250ml") and end at a word
 * boundary; single-letter units also may not be followed by "-" or "'"
 * so "t-bone" is not a teaspoon (the inch mark in `2"-piece` still is a unit),
 * unless the hyphen starts the other end of a range ("800g-1kg").
 */
export function createUnitMatcher(text: string): UnitMatcher {
  const lower = text.toLowerCase();

  return {
    matchAt(offset) {
      if (isLetter(text[offset - 1])) return null;

      for (const alias of ALIASES) {
        const source = alias.caseSensitive ? text : lower;
        if (!source.startsWith(alias.text, offset)) continue;

        let end = offset + alias.text.length;
        if (
          alias.abbreviation &&
          text[end] === "." &&
          !isLetterOrDigit(text[end + 1])
        ) {
          end += 1;
        }

        const next = text[end];
        if (isLetterOrDigit(next)) continue;
        const hyphenStartsRange = next === "-" && /[0-9]/.test(text[end + 1] ?? "");
        if (
          alias.text.length === 1 &&
          isLetter(alias.text) &&
          ((next === "-" && !hyphenStartsRange) || next === "'")
        ) {
          continue;
        }

        return {
          id: alias.unit.id,
          dimension: alias.unit.dimension,
          length: end - offset,
        };
      }

      return null;
    },
  };
}

export function getUnitDefinition(id: string): UnitDefinition | undefined {
  return UNIT_TABLE.find((unit) => unit.id === id);
}
