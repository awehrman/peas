import type { IngredientDietaryTag, IngredientStoredProperty } from "../types";

const CORE_TYPES = new Set<IngredientStoredProperty>([
  "MEAT",
  "FISH",
  "DAIRY",
  "EGG",
  "GRAIN",
  "LEGUME",
  "FRUIT",
  "VEGETABLE",
  "HERB",
  "SPICE",
  "FAT",
  "SWEETENER",
  "SEASONING",
]);

/**
 * The automatic tags for a food's properties in effect: vegetarian with no meat or fish, vegan when also free of dairy and egg, gluten-free without gluten. Nothing without a core type, so an unclassified food is never tagged. Mirrors `dietaryTagsFor` in @peas/database so the card updates while editing.
 *
 * @example
 * dietaryTagsFor(["VEGETABLE"])       // ["VEGAN", "VEGETARIAN", "GLUTEN_FREE"]
 * dietaryTagsFor(["DAIRY"])           // ["VEGETARIAN", "GLUTEN_FREE"]
 * dietaryTagsFor(["GRAIN", "GLUTEN"]) // ["VEGAN", "VEGETARIAN"]
 * dietaryTagsFor(["GLUTEN"])          // []
 */
export function dietaryTagsFor(
  inEffect: readonly IngredientStoredProperty[]
): IngredientDietaryTag[] {
  const present = new Set(inEffect);
  if (![...present].some((property) => CORE_TYPES.has(property))) return [];
  const isVegetarian = !present.has("MEAT") && !present.has("FISH");
  const isVegan = isVegetarian && !present.has("DAIRY") && !present.has("EGG");
  return [
    ...(isVegan ? (["VEGAN"] as const) : []),
    ...(isVegetarian ? (["VEGETARIAN"] as const) : []),
    ...(present.has("GLUTEN") ? [] : (["GLUTEN_FREE"] as const)),
  ];
}
