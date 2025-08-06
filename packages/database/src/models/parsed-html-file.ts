export type ParsedIngredientLine = {
  blockIndex: number;
  lineIndex: number;
  parseStatus?: "AWAITING_PARSING" | "COMPLETED_SUCCESSFULLY" | "COMPLETED_WITH_ERROR";
  parsedAt?: Date;
  reference: string;
  rule?: string;
};

export type ParsedInstructionLine = {
  parseStatus?: "AWAITING_PARSING" | "COMPLETED_SUCCESSFULLY" | "COMPLETED_WITH_ERROR";
  lineIndex: number;
  reference: string;
};

export type ParsedHTMLFile = {
  title: string;
  contents: string;
  ingredients: ParsedIngredientLine[];
  instructions: ParsedInstructionLine[];
  images?: Array<{
    id: string;
    originalImageUrl: string;
    thumbnailImageUrl?: string;
    crop3x2ImageUrl?: string;
    crop4x3ImageUrl?: string;
    crop16x9ImageUrl?: string;
    originalWidth?: number;
    originalHeight?: number;
    originalSize?: number;
    originalFormat?: string;
    processingStatus: string;
  }>;
  evernoteMetadata?: {
    originalCreatedAt?: Date;
    source?: string;
    tags?: string[];
    // NOTE we oddly don't receive the notebook on export,
    // but we can add this back in if we want to grab this from the sdk
  };
};
