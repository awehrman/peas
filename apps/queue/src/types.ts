export type ParsedHTMLFile = {
  title: string;
  contents: string;
  ingredients: string[][];
  instructions: string[];
  sourceUrl?: string;
  image?: string;
};
