export type ParsedIngredientLine = {
  blockIndex: number;
  lineIndex: number;
  parseStatus?: "PENDING" | "CORRECT" | "INCORRECT" | "ERROR";
  parsedAt?: Date;
  reference: string;
  rule?: string;
};

export type ParsedInstructionLine = {
  parseStatus?: "PENDING" | "CORRECT" | "INCORRECT" | "ERROR";
  lineIndex: number;
  reference: string;
};

export type ParsedHTMLFile = {
  title: string;
  historicalCreatedAt?: Date;
  contents: string;
  ingredients: ParsedIngredientLine[];
  instructions: ParsedInstructionLine[];
  sourceUrl?: string;
  image?: string;
};
