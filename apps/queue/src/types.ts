// TEMP hard code these in for a moment
// i'll eventually want to move both the types and this parsing stuff into its own package

export type ParsedSegment = {
  id: string;
  index: number;
  // ingredient: Ingredient;
  // ingredientId: string;
  ingredientLineId: string;
  rule: string;
  type: string;
  value: string;
  createdAt: string;
  updatedAt: string;
};

export type IngredientLine = {
  id: string;
  blockIndex: number;
  isParsed: boolean;
  lineIndex: number;
  parsed: ParsedSegment[];
  reference: string;
  rule: string;
  createdAt: string;
  updatedAt: string;
};

export type InstructionLine = {
  id: string;
  blockIndex: number;
  reference: string;
  createdAt: string;
  updatedAt: string;
};

export type ParsedContent = {
  ingredients: IngredientLine[];
  instructions: InstructionLine[];
  ingHash: IngredientHash;
};

export type BlockObject = {
  blockIndex: number;
  lineIndex?: number;
  reference: string;
};

export type Blocks = Array<Array<BlockObject>>;

export type IngredientValueHash = {
  [value: string]: string | null;
};

export type CreateIngredientData = {
  name: string;
  plural?: string;
};

export type IngredientHash = {
  matchBy: string[];
  valueHash: IngredientValueHash;
  createData: CreateIngredientData[];
};

export type ParsedIngredientLineResult = {
  line: IngredientLine;
};
