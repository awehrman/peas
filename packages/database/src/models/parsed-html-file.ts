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
  contents: string;
  ingredients: ParsedIngredientLine[];
  instructions: ParsedInstructionLine[];
  image?: string;
  evernoteMetadata?: {
    originalCreatedAt?: Date;
    source?: string;
    tags?: string[];
    // NOTE we oddly don't receive the notebook on export,
    // but we can add this back in if we want to grab this from the sdk
  };
};
