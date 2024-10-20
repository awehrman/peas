export type ParsedIngredientLine = {
  blockIndex: number;
  lineIndex: number;
  containsParsingErrors?: boolean;
  parsedAt?: Date;
  reference: string;
  rule?: string;
};

export type ParsedInstructionLine = {
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
