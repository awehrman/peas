export type ParsedIngredientLine = {
  blockIndex: number;
  lineIndex: number;
  reference: string;
  isParsed: boolean;
  parsedAt?: Date;
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
