/**
 * Type definitions for @peas/parser package
 */

export interface ParserResult {
  rule: string;
  type: string;
  values: ParserSegment[];
}

export interface ParserSegment {
  rule: string;
  type: string;
  value: string | number;
}

/**
 * V1 Parser
 */
export declare function parse(input: string): ParserResult;

/**
 * Module exports for different parser versions
 */
declare module "@peas/parser/v1/minified" {
  export function parse(input: string): ParserResult;
}

declare module "@peas/parser/v2/minified" {
  export function parse(input: string): ParserResult;
}

declare module "@peas/parser/v1" {
  export function parse(input: string): ParserResult;
}

declare module "@peas/parser/v2" {
  export function parse(input: string): ParserResult;
} 