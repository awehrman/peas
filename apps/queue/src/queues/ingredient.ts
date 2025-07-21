import { serviceContainer } from "../services/container";
import type {
  TypedQueue,
  IngredientJobData,
  IngredientActionName,
} from "../types";

export const ingredientQueue: TypedQueue<
  IngredientJobData,
  IngredientActionName
> = serviceContainer.queues.ingredientQueue as TypedQueue<
  IngredientJobData,
  IngredientActionName
>;
