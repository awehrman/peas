import { createQueue } from "./createQueue";
import { createIngredientWorker } from "../workers/ingredient-worker";
import { serviceContainer } from "../services/container";

export const ingredientQueue = createQueue("ingredientQueue");

// Create and start the ingredient worker
createIngredientWorker(ingredientQueue, serviceContainer);
