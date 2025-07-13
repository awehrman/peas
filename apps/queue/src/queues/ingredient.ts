import { createQueue } from "./createQueue";
import { setupIngredientWorker } from "../workers/ingredient";

export const ingredientQueue = createQueue("ingredientQueue");
setupIngredientWorker(ingredientQueue);
