/**
 * True when ten characters (digits, last may be X) pass the ISBN-10 checksum.
 *
 * @example
 * isValidIsbn10("0743246268") // true
 */
export function isValidIsbn10(value: string): boolean {
  if (!/^\d{9}[\dX]$/.test(value)) return false;
  let sum = 0;
  for (let index = 0; index < 10; index++) {
    const character = value[index] as string;
    const digit = character === "X" ? 10 : Number(character);
    sum += digit * (10 - index);
  }
  return sum % 11 === 0;
}

/**
 * True when thirteen digits starting with 978 or 979 pass the ISBN-13 checksum.
 *
 * @example
 * isValidIsbn13("9780743246262") // true
 */
export function isValidIsbn13(value: string): boolean {
  if (!/^97[89]\d{10}$/.test(value)) return false;
  let sum = 0;
  for (let index = 0; index < 13; index++) {
    sum += Number(value[index]) * (index % 2 === 0 ? 1 : 3);
  }
  return sum % 10 === 0;
}

/**
 * Converts a valid ISBN-10 to its ISBN-13 form.
 *
 * @example
 * isbn10To13("0743246268") // "9780743246262"
 */
export function isbn10To13(isbn10: string): string {
  const body = `978${isbn10.slice(0, 9)}`;
  let sum = 0;
  for (let index = 0; index < 12; index++) {
    sum += Number(body[index]) * (index % 2 === 0 ? 1 : 3);
  }
  return `${body}${(10 - (sum % 10)) % 10}`;
}

export interface ExtractedIsbn {
  isbn13: string;
  isbn10: string | null;
}

/**
 * Finds checksum-valid ISBNs in free text (hyphens and spaces allowed), as ISBN-13 with the ISBN-10 when that was the written form.
 *
 * @example
 * extractIsbns("Joy of Cooking, ISBN 0-7432-4626-8") // [{ isbn13: "9780743246262", isbn10: "0743246268" }]
 */
export function extractIsbns(text: string): ExtractedIsbn[] {
  const found = new Map<string, ExtractedIsbn>();
  const candidates = text.toUpperCase().match(/[\dX][\dX\- ]{8,20}[\dX]/g) ?? [];
  for (const candidate of candidates) {
    const compact = candidate.replace(/[- ]/g, "");
    if (compact.length === 13 && isValidIsbn13(compact)) {
      if (!found.has(compact)) found.set(compact, { isbn13: compact, isbn10: null });
    } else if (compact.length === 10 && isValidIsbn10(compact)) {
      const isbn13 = isbn10To13(compact);
      found.set(isbn13, { isbn13, isbn10: compact });
    }
  }
  return [...found.values()];
}
