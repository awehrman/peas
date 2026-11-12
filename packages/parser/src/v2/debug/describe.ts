import type {
  IngredientLineSyntax,
  IngredientSegmentSyntax,
  PhraseItem,
  Quantity,
} from "../ast/types.js";
import { formatRational } from "../quantity/rational.js";

export function describeQuantity(quantity: Quantity): string {
  switch (quantity.kind) {
    case "EXACT":
      return [
        quantity.implied ? `(${formatRational(quantity.value)})` : formatRational(quantity.value),
        quantity.unit?.id,
      ]
        .filter(Boolean)
        .join(" ");
    case "RANGE":
      return [
        `${formatRational(quantity.minimum)}-${formatRational(quantity.maximum)}`,
        quantity.unit?.id,
      ]
        .filter(Boolean)
        .join(" ");
    case "APPROXIMATE":
      return `~${describeQuantity(quantity.quantity)}`;
    case "PACKAGE": {
      const size = quantity.packageSize ? ` (${describeQuantity(quantity.packageSize)})` : "";
      return `${formatRational(quantity.count)}${size}${quantity.packageType ? ` ${quantity.packageType.id}` : ""}`;
    }
    case "ALTERNATIVE":
      return quantity.options.map(describeQuantity).join(" | ");
    case "SUM":
      return quantity.parts.map(describeQuantity).join(" + ");
    case "UNSPECIFIED":
      return quantity.expression;
  }
}

export function describeItem(item: PhraseItem): string {
  switch (item.kind) {
    case "LEXEME":
      return `{${item.span.text}:${item.roles.join("/")}}`;
    case "UNKNOWN":
      return item.span.text;
    case "PUNCT":
      return item.span.text;
  }
}

/** Joins items with a space only where the source had a gap ("flat-leaf" stays together). */
export function describePhrase(
  items: PhraseItem[],
  render: (item: PhraseItem) => string = describeItem
): string {
  return items
    .map((item, index) => {
      const previous = items[index - 1];
      const separator = previous && previous.span.end < item.span.start ? " " : "";
      return `${separator}${render(item)}`;
    })
    .join("");
}

/** The phrase as written, without lexeme markup. */
export function phraseText(items: PhraseItem[]): string {
  return describePhrase(items, (item) => item.span.text);
}

export function describeSegment(segment: IngredientSegmentSyntax): string {
  const parts: string[] = [];
  if (segment.quantity) parts.push(`[${describeQuantity(segment.quantity)}]`);
  if (segment.measurementModifiers.length) {
    parts.push(`<${describePhrase(segment.measurementModifiers)}>`);
  }
  if (segment.phrase.length) parts.push(describePhrase(segment.phrase));
  for (const parenthetical of segment.parentheticals) {
    const inner = [
      parenthetical.quantity ? `[${describeQuantity(parenthetical.quantity)}]` : "",
      describePhrase(parenthetical.phrase),
    ].filter(Boolean);
    parts.push(`(${inner.join(" ")})`);
  }
  if (segment.trailing?.phrase.length) parts.push(`, ${describePhrase(segment.trailing.phrase)}`);
  return parts.join(" ");
}

/** One-line summary of a parse, for reports, previews, and debugging. */
export function describeSyntax(line: IngredientLineSyntax): string {
  const body = line.segments.map(describeSegment).join(" ; ");
  const unparsed = line.unparsed.length
    ? ` !unparsed: ${line.unparsed.map((span) => span.text).join(" | ")}`
    : "";
  return `${line.status === "PARSED" ? "" : `${line.status} `}${body}${unparsed}`;
}
