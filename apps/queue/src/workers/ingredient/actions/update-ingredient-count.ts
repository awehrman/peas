import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";

export interface UpdateIngredientCountDeps {
  addStatusEventAndBroadcast: (event: {
    importId: string;
    noteId?: string;
    status: string;
    message: string;
    context: string;
    indentLevel?: number;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
}

export interface UpdateIngredientCountData {
  importId: string;
  noteId?: string;
  currentIngredientIndex: number;
  totalIngredients: number;
}

export class UpdateIngredientCountAction extends BaseAction<
  UpdateIngredientCountData,
  UpdateIngredientCountDeps
> {
  name = "update_ingredient_count";

  async execute(
    data: UpdateIngredientCountData,
    deps: UpdateIngredientCountDeps,
    _context: ActionContext
  ): Promise<UpdateIngredientCountData> {
    const { importId, noteId, currentIngredientIndex, totalIngredients } = data;

    // Determine if this is the final ingredient
    const isComplete = currentIngredientIndex === totalIngredients;
    const status = isComplete ? "COMPLETED" : "PROCESSING";
    const emoji = isComplete ? "✅" : "⏳";

    await deps.addStatusEventAndBroadcast({
      importId,
      noteId,
      status,
      message: `${emoji} ${currentIngredientIndex}/${totalIngredients} ingredients`,
      context: "parse_html_ingredients",
      indentLevel: 2, // Additional indentation for ingredients
      metadata: {
        currentIngredientIndex,
        totalIngredients,
        isComplete,
      },
    });

    return data;
  }
}
