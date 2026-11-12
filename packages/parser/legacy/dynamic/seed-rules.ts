import { getDefaultFormatter } from "./compile-grammar.js";
import type { GrammarRuleInput } from "./types.js";

/**
 * Starter grammar that parses lines like "11 apples" and "one apple".
 * It's deliberately tiny: the point is to rebuild the static v1 grammar
 * rule by rule from the UI.
 */
export const BASIC_GRAMMAR_RULES: GrammarRuleInput[] = [
  {
    name: "ingredientLine",
    label: "Ingredient Line",
    order: 0,
    definitions: [
      {
        type: "RULE",
        order: 0,
        example: "11 apples",
        rule: "amt:(@amount _+)? ing:ingredient",
        formatter: getDefaultFormatter(
          "ingredientLine",
          "[amt, ing].filter(Boolean)"
        ),
        list: [],
      },
    ],
  },
  {
    name: "ingredient",
    label: "Ingredient",
    order: 1,
    definitions: [
      {
        type: "RULE",
        order: 0,
        example: "apple",
        rule: "ing:$(letter+ (_+ letter+)*)",
        formatter: getDefaultFormatter("ingredient", "[ing.toLowerCase()]"),
        list: [],
      },
    ],
  },
  {
    name: "amount",
    label: "Amount",
    order: 2,
    definitions: [
      {
        type: "RULE",
        order: 0,
        example: "one",
        rule: "amt:amountKeyword",
        formatter: getDefaultFormatter("amount", "[amt.toLowerCase()]"),
        list: [],
      },
      {
        type: "RULE",
        order: 1,
        example: "11",
        rule: "amt:digits",
        formatter: getDefaultFormatter("amount", "[amt]"),
        list: [],
      },
    ],
  },
  {
    name: "digits",
    label: "Digits",
    order: 3,
    definitions: [
      {
        type: "RULE",
        order: 0,
        example: "11",
        rule: "$([0-9]+)",
        formatter: "",
        list: [],
      },
    ],
  },
  {
    name: "_",
    label: "Whitespace",
    order: 4,
    definitions: [
      {
        type: "RULE",
        order: 0,
        example: "",
        rule: "[ \\t]",
        formatter: "",
        list: [],
      },
    ],
  },
  {
    name: "letter",
    label: "Letter",
    order: 5,
    definitions: [
      {
        type: "RULE",
        order: 0,
        example: "",
        rule: "[a-z]i",
        formatter: "",
        list: [],
      },
    ],
  },
  {
    name: "amountKeyword",
    label: "Amount Keyword",
    order: 6,
    definitions: [
      {
        type: "LIST",
        order: 0,
        example: "",
        rule: "",
        formatter: "",
        list: ["'three'i", "'one'i", "'two'i"],
      },
    ],
  },
];
