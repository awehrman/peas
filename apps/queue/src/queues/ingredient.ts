import { createQueue } from "./createQueue";
import { setupIngredientWorker } from "../workers/ingredients";

export const ingredientQueue = createQueue("ingredientQueue");
setupIngredientWorker(ingredientQueue);
