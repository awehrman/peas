import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import { ProcessCategorizationOutput } from "./process-categorization";

export interface SaveCategorizationInput {
  noteId: string;
  categorization: ProcessCategorizationOutput;
}

export interface SaveCategorizationOutput {
  success: boolean;
  categoriesSaved: number;
  tagsSaved: number;
}

export class SaveCategorizationAction extends BaseAction<
  SaveCategorizationInput,
  SaveCategorizationOutput
> {
  name = "save-categorization";

  async execute(
    input: SaveCategorizationInput,
    _deps: object,
    _context: ActionContext
  ): Promise<SaveCategorizationOutput> {
    try {
      const { noteId, categorization } = input;

      // TODO: Implement actual database save logic
      // This would typically involve:
      // 1. Creating/updating categories in the database
      // 2. Creating/updating tags in the database
      // 3. Linking categories and tags to the note
      // 4. Updating the note with categorization metadata

      // Stub implementation for now
      console.log(`Saving categorization for note ${noteId}:`, {
        categories: categorization.categories,
        tags: categorization.tags,
        confidence: categorization.confidence,
      });

      // Simulate database operations
      const categoriesSaved = categorization.categories.length;
      const tagsSaved = categorization.tags.length;

      const result: SaveCategorizationOutput = {
        success: true,
        categoriesSaved,
        tagsSaved,
      };

      return result;
    } catch (error) {
      throw new Error(`Failed to save categorization: ${error}`);
    }
  }
}
