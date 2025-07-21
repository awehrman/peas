import { CompletionStatusAction as CoreCompletionStatusAction } from "../../core/completed-status-action";
import type {
  IngredientWorkerDependencies,
  SaveIngredientLineOutput,
} from "../types";

export interface CompletionStatusInput extends SaveIngredientLineOutput {
  // Additional fields for completion tracking
  importId?: string;
  currentIngredientIndex?: number;
  totalIngredients?: number;
}

/**
 * Ingredient-specific completion status action using the generic core implementation.
 */
export class CompletionStatusAction extends CoreCompletionStatusAction<
  CompletionStatusInput,
  IngredientWorkerDependencies
> {}
