export interface ParserSegment {
  rule: string;
  type: string;
  value: string | number;
}

export interface ParserResult {
  rule: string;
  type: string;
  values: ParserSegment[];
}
