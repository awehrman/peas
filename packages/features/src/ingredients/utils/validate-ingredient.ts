export interface IngredientNameErrors {
  name?: string;
  plural?: string;
}

/**
 * Client-side checks mirrored by the server action's schema.
 */
export function validateIngredientNames(
  name: string,
  plural: string | null
): IngredientNameErrors {
  const errors: IngredientNameErrors = {};
  const trimmedName = name.trim();
  const trimmedPlural = plural?.trim() ?? "";

  if (!trimmedName) errors.name = "Name is required";
  if (trimmedPlural && trimmedPlural.toLowerCase() === trimmedName.toLowerCase()) {
    errors.plural = "Plural must be different from the name";
  }

  return errors;
}
