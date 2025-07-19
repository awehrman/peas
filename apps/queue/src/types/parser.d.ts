declare module "@peas/parser" {
  interface ParsedResult {
    rule?: string;
    type?: string;
    values?: Array<{
      rule?: string;
      type?: string;
      value?: string;
      values?: string[] | string;
    }>;
    parsed?: Array<{
      values?: Array<{
        rule?: string;
        type?: string;
        values?: string[] | string;
      }>;
    }>;
  }

  export const v1: {
    parse(input: string): ParsedResult;
  };

  export const v2: {
    parse(input: string): ParsedResult;
  };

  export function parse(input: string): ParsedResult;
}
