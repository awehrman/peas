export const TOKEN_KINDS = ["WORD", "NUMBER", "PUNCT"] as const;
export type TokenKind = (typeof TOKEN_KINDS)[number];

export interface Token {
  text: string;
  start: number;
  end: number;
  kind: TokenKind;
}

const PUNCTUATION = new Set([
  ",", ";", ":", "(", ")", "[", "]", "{", "}", "/", "&", "+", "-", '"', "!", "?", "*", "~", "#", "%", "=",
]);

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const LETTER = /\p{L}/u;

function isLetterOrDigit(char: string | undefined): boolean {
  return char !== undefined && LETTER_OR_DIGIT.test(char);
}

/** A period only belongs to a word when it sits between letters or digits ("e.g", "1.5"). */
function isWordChar(text: string, index: number): boolean {
  const char = text[index];
  if (char === undefined || char === " " || PUNCTUATION.has(char)) return false;
  if (char === ".") {
    return isLetterOrDigit(text[index - 1]) && isLetterOrDigit(text[index + 1]);
  }
  return true;
}

/**
 * Splits normalized text into words, numbers, and single punctuation
 * characters. The lexicon trie and the grammar both use these boundaries, so
 * a lexicon match always starts and ends where the grammar expects a token.
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < text.length) {
    if (text[index] === " ") {
      index += 1;
      continue;
    }

    if (!isWordChar(text, index)) {
      tokens.push({ text: text[index] ?? "", start: index, end: index + 1, kind: "PUNCT" });
      index += 1;
      continue;
    }

    const start = index;
    while (index < text.length && isWordChar(text, index)) index += 1;
    const tokenText = text.slice(start, index);
    tokens.push({
      text: tokenText,
      start,
      end: index,
      kind: LETTER.test(tokenText) ? "WORD" : "NUMBER",
    });
  }

  return tokens;
}

/** The key used to compare tokens across the lexicon and input text. */
export function tokenKey(token: Pick<Token, "text">): string {
  return token.text.toLowerCase();
}
