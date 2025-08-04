import type { ParserResult } from "../services/ingredient/actions/parse-ingredient-line/types";

declare module "@peas/parser/v2/minified" {
  /** Parses using v2 grammar */
  export function parse(input: string): ParserResult;
}

declare module "@peas/parser/v1/minified" {
  /** Parses using v1 grammar */
  export function parse(input: string): ParserResult;
}
