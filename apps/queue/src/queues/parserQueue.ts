import { createQueue } from "./createQueue";
import { setupIngredientParserWorker } from "../workers/ingredientParserWorker";

export const parserQueue = createQueue("parserQueue");
setupIngredientParserWorker(parserQueue);
