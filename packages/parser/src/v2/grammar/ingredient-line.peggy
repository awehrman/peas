// v2 structural ingredient-line grammar.
//
// Recognizes what is syntactically present (amounts, ranges, units, packages,
// parentheticals, trailing comments, multi-ingredient lines) and leaves food
// identity to the lexicon and resolver. It contains no ingredient or
// descriptor lists. Number, fraction, range, and package handling are ported
// from the v1 grammar (packages/parser/src/v1/parser.peggy).
//
// Runs on normalized text (see src/v2/normalize) and reads three parse
// options supplied by parse-line.ts:
//   options.units    UnitMatcher            - unit spelled at an offset
//   options.lexicon  Map<offset, match>     - chosen lexicon matches
//   options.tokens   Map<offset, token>     - token boundaries
// Every node carries normalized offsets; parse-line.ts maps them to raw text.

{
  let pendingUnit = null;
  let pendingLexeme = null;
  let pendingToken = null;

  const NON_PACKAGE_DIMENSIONS = ["MASS", "VOLUME", "LENGTH"];
  const PACKAGE_DIMENSIONS = ["PACKAGE", "COUNT"];

  function here() {
    const l = location();
    return { start: l.start.offset, end: l.end.offset };
  }

  function rat(numerator, denominator) {
    return { numerator, denominator };
  }

  function lexemeAt(position, roles) {
    const match = options.lexicon ? options.lexicon.get(position) : undefined;
    if (!match) return null;
    if (roles && !match.roles.some((role) => roles.includes(role))) return null;
    return match;
  }

  function unitAt(position, dimensions) {
    const match = options.units.matchAt(position);
    if (!match) return null;
    if (dimensions && !dimensions.includes(match.dimension)) return null;
    return match;
  }

  function amountQuantity(amount, unit, span) {
    return amount.range
      ? { kind: "RANGE", minimum: amount.minimum, maximum: amount.maximum, unit, ...span }
      : { kind: "EXACT", value: amount.value, unit, ...span };
  }
}

IngredientLine
  = _ head:Segment? tail:(SegmentJoin @Segment)* _ rest:Rest?
    {
      return { segments: head ? [head, ...tail] : [], unparsed: rest ? [rest] : [] };
    }

Rest
  = .+ { return here(); }

// "1 tbsp butter and 2 tbsp olive oil": a conjunction followed by a number
// starts a new ingredient segment.
SegmentJoin
  = _ ("and"i End / "&" / "plus"i End / "+") _ &[0-9]

/*----------  Segments  ----------*/

Segment
  = lead:LeadingQuantity _ (Of _)? phrase:Phrase
    {
      return { ...here(), quantity: lead.quantity, modifiers: lead.modifiers, items: phrase.items, trailing: phrase.trailing };
    }
  // "1 cup", "6 cloves": a quantity with nothing after it
  / lead:LeadingQuantity _ !.
    {
      return { ...here(), quantity: lead.quantity, modifiers: lead.modifiers, items: [], trailing: null };
    }
  / quantity:BareQuantity _ phrase:Phrase
    {
      return { ...here(), quantity, modifiers: [], items: phrase.items, trailing: phrase.trailing };
    }
  // "olive oil 2 tbsp", "garlic 2 cloves, sliced": the quantity follows the phrase
  / items:PostfixPhrase __ lead:PostfixQuantity trailing:Trailing?
    {
      return { ...here(), quantity: lead.quantity, modifiers: lead.modifiers, items, trailing: trailing ?? null };
    }
  / phrase:Phrase
    {
      return { ...here(), quantity: null, modifiers: [], items: phrase.items, trailing: phrase.trailing };
    }

PostfixPhrase
  = !"," first:Item rest:(!(__ PostfixQuantity PostfixEnd) !SegmentJoin _ !"," @Item)*
    {
      return [first, ...rest];
    }

PostfixQuantity
  = LeadingQuantity
  / quantity:BareQuantity { return { quantity, modifiers: [] }; }

PostfixEnd
  = _ ("," / !.)

Phrase
  = !"," first:Item rest:(!SegmentJoin _ !"," @Item)* trailing:Trailing?
    {
      return { items: [first, ...rest], trailing: trailing ?? null };
    }

Trailing
  = _ body:TrailingBody { return body; }

TrailingBody
  = "," items:(_ @TrailingItems)?
    {
      return { ...here(), items: items ?? [] };
    }

TrailingItems
  = first:TrailingItem rest:(!SegmentJoin _ @TrailingItem)*
    {
      return [first, ...rest];
    }

TrailingItem
  = Item
  / "," { return { kind: "PUNCT", ...here() }; }

Item
  = Paren
  / Marker
  / Known
  / Conjunction
  / Word
  / Punct

/*----------  Phrase items  ----------*/

Paren
  = "(" _ inner:ParenInner _ ")"
    {
      return { kind: "PAREN", ...here(), quantity: inner.quantity, items: inner.items };
    }

ParenInner
  = quantity:ParenQuantity _ &")" { return { quantity, items: [] }; }
  / items:ParenItems? { return { quantity: null, items: items ?? [] }; }

ParenItems
  = first:ParenItem rest:(_ @ParenItem)* { return [first, ...rest]; }

ParenItem
  = Marker
  / Known
  / Conjunction
  / Word
  / !")" !"(" punct:Punct { return punct; }

// "to taste" / "as needed" are structural: with no other quantity they become
// the segment's (unspecified) quantity.
Marker
  = expression:MarkerExpression { return { kind: "MARKER", expression, ...here() }; }

MarkerExpression
  = "to"i __ "taste"i End { return "TO_TASTE"; }
  / "as"i __ "needed"i End { return "AS_NEEDED"; }

Known
  = &{ pendingLexeme = lexemeAt(offset()); return pendingLexeme !== null; }
    $(. .|{ return pendingLexeme.end - pendingLexeme.start - 1; }|)
    {
      return { kind: "LEXEME", ...here(), entryIds: pendingLexeme.entryIds, roles: pendingLexeme.roles };
    }

Conjunction
  = ("and/or"i / "and"i / "or"i / "&") End { return { kind: "CONJ", ...here() }; }

Word
  = &{
      pendingToken = options.tokens.get(offset()) ?? null;
      return pendingToken !== null && pendingToken.kind !== "PUNCT";
    }
    $(. .|{ return pendingToken.end - pendingToken.start - 1; }|)
    { return { kind: "UNKNOWN", ...here() }; }

Punct
  = &{
      pendingToken = options.tokens.get(offset()) ?? null;
      return pendingToken !== null && pendingToken.kind === "PUNCT";
    }
    .
    { return { kind: "PUNCT", ...here() }; }

/*----------  Quantities  ----------*/

LeadingQuantity
  = marker:Approximately _ core:QuantityCore
    {
      return {
        quantity: { kind: "APPROXIMATE", quantity: core.quantity, marker, ...here() },
        modifiers: core.modifiers,
      };
    }
  / QuantityCore
  / quantity:Unspecified { return { quantity, modifiers: [] }; }
  / core:ImpliedUnitQuantity _ &Of { return core; }

QuantityCore
  = quantity:PackageQuantity { return { quantity, modifiers: [] }; }
  / SumQuantity
  / AlternativeQuantity
  / UnitQuantity

// Amount without a unit: "2 eggs", "2-3 apples"
BareQuantity
  = marker:Approximately _ amount:AmountOrRange
    {
      return { kind: "APPROXIMATE", quantity: amountQuantity(amount, null, here()), marker, ...here() };
    }
  / amount:AmountOrRange { return amountQuantity(amount, null, here()); }

// "1 1/2 cups", "2-3 tbsp", "14-oz", "1 heaping cup", "half a cup"
UnitQuantity
  = amount:AmountOrRangeWithArticle _ (("an"i / "a"i) End _)? "-"? _ modifiers:(@MeasureModifier _)* unit:Unit
    {
      return { quantity: amountQuantity(amount, unit, here()), modifiers };
    }

// "1 cup plus 2 tbsp", "1/4 cup, plus 1 tablespoon"
SumQuantity
  = a:UnitQuantity _ ","? _ ("plus"i End / "+" / "and"i End) _ b:UnitQuantity
    {
      return {
        quantity: { kind: "SUM", parts: [a.quantity, b.quantity], ...here() },
        modifiers: [...a.modifiers, ...b.modifiers],
      };
    }

// "2 cups or 500 ml", "1 cup/250 ml", "1 cup (250 ml)"
AlternativeQuantity
  = a:UnitQuantity _ ("/" / "or"i End) _ b:UnitQuantity
    {
      return {
        quantity: { kind: "ALTERNATIVE", options: [a.quantity, b.quantity], ...here() },
        modifiers: [...a.modifiers, ...b.modifiers],
      };
    }
  / a:UnitQuantity _ "(" _ b:ParenQuantity _ ")"
    &{ return !PACKAGE_DIMENSIONS.includes(a.quantity.unit.dimension); }
    {
      return {
        quantity: { kind: "ALTERNATIVE", options: [a.quantity, b], ...here() },
        modifiers: a.modifiers,
      };
    }

// Quantities inside parentheses: "(14 oz)", "(about 2 cups)", "(400 g each)"
ParenQuantity
  = marker:Approximately _ core:ParenQuantityCore Each?
    {
      return { kind: "APPROXIMATE", quantity: core, marker, ...here() };
    }
  / core:ParenQuantityCore Each? { return core; }

ParenQuantityCore
  = sum:SumQuantity { return sum.quantity; }
  / alternative:AlternativeQuantity { return alternative.quantity; }
  / unit:UnitQuantity { return unit.quantity; }

// "2 (14 oz) cans", "1 can (400 g)", "2 14-oz cans", "2 x 400g tins",
// "2 (6 oz) salmon fillets", "4 6-ounce fillets"
PackageQuantity
  = count:AmountWithArticle _ "(" _ size:SizeQuantity Each? _ ")" _ type:PackageUnit
    {
      return { kind: "PACKAGE", count, packageType: type, packageSize: size, ...here() };
    }
  // "1 (2-inch) piece" is handled above; "1 (2"-piece)" keeps the type inside
  / count:AmountWithArticle _ "(" _ size:SizeQuantity _ "-"? _ type:PackageUnit _ ")"
    {
      return { kind: "PACKAGE", count, packageType: type, packageSize: size, ...here() };
    }
  / count:AmountWithArticle _ type:PackageUnit _ "(" _ size:SizeQuantity Each? _ ")"
    {
      return { kind: "PACKAGE", count, packageType: type, packageSize: size, ...here() };
    }
  / count:AmountWithArticle _ ("x"i _)? size:SizeQuantity _ type:PackageUnit
    {
      return { kind: "PACKAGE", count, packageType: type, packageSize: size, ...here() };
    }
  / count:Amount _ "x"i _ size:SizeQuantity
    {
      return { kind: "PACKAGE", count, packageSize: size, ...here() };
    }
  / count:Amount _ "(" _ size:SizeQuantity Each? _ ")"
    {
      return { kind: "PACKAGE", count, packageSize: size, ...here() };
    }
  / count:Amount __ size:HyphenSizeQuantity
    {
      return { kind: "PACKAGE", count, packageSize: size, ...here() };
    }

SizeQuantity
  = marker:Approximately _ core:SizeQuantityCore
    {
      return { kind: "APPROXIMATE", quantity: core, marker, ...here() };
    }
  / SizeQuantityCore

SizeQuantityCore
  = amount:AmountOrRange _ "-"? _ unit:SizeUnit { return amountQuantity(amount, unit, here()); }

HyphenSizeQuantity
  = amount:Amount "-" unit:SizeUnit { return amountQuantity({ range: false, value: amount }, unit, here()); }

// "pinch of salt", "handful of basil": the unit implies an amount of one
ImpliedUnitQuantity
  = modifiers:(@MeasureModifier _)* unit:Unit
    {
      return {
        quantity: { kind: "EXACT", value: rat(1, 1), unit, implied: true, ...here() },
        modifiers,
      };
    }

Unspecified
  = expression:UnspecifiedExpression { return { kind: "UNSPECIFIED", expression, ...here() }; }

UnspecifiedExpression
  = "some"i End { return "SOME"; }
  / "a"i __ "few"i End { return "FEW"; }
  / "few"i End { return "FEW"; }
  / "several"i End { return "SEVERAL"; }

Approximately
  = ("approximately"i / "approx."i / "approx"i / "about"i / "around"i / "roughly"i / "circa"i / "ca."i) End
    { return here(); }
  / "~" { return here(); }

MeasureModifier
  = &{ pendingLexeme = lexemeAt(offset(), ["MEASUREMENT_MODIFIER", "DEGREE"]); return pendingLexeme !== null; }
    $(. .|{ return pendingLexeme.end - pendingLexeme.start - 1; }|)
    {
      return { kind: "LEXEME", ...here(), entryIds: pendingLexeme.entryIds, roles: pendingLexeme.roles };
    }

/*----------  Units  ----------*/

Unit
  = &{ pendingUnit = unitAt(offset()); return pendingUnit !== null; }
    $(. .|{ return pendingUnit.length - 1; }|)
    { return { id: pendingUnit.id, dimension: pendingUnit.dimension, ...here() }; }

PackageUnit
  = &{ pendingUnit = unitAt(offset(), PACKAGE_DIMENSIONS); return pendingUnit !== null; }
    $(. .|{ return pendingUnit.length - 1; }|)
    { return { id: pendingUnit.id, dimension: pendingUnit.dimension, ...here() }; }

SizeUnit
  = &{ pendingUnit = unitAt(offset(), NON_PACKAGE_DIMENSIONS); return pendingUnit !== null; }
    $(. .|{ return pendingUnit.length - 1; }|)
    { return { id: pendingUnit.id, dimension: pendingUnit.dimension, ...here() }; }

/*----------  Amounts  ----------*/

AmountOrRange
  = minimum:Amount _ RangeSeparator _ maximum:Amount { return { range: true, minimum, maximum }; }
  / value:Amount { return { range: false, value }; }

AmountOrRangeWithArticle
  = minimum:Amount _ RangeSeparator _ maximum:Amount { return { range: true, minimum, maximum }; }
  / value:AmountWithArticle { return { range: false, value }; }

RangeSeparator
  // "1- to 1 1/2-pound"
  = "-" _ "to"i End
  / "-"
  / "to"i End
  / "or"i End

// "a" / "an" only count as one when a unit or package follows ("a pinch")
AmountWithArticle
  = Amount
  / ("an"i / "a"i) End { return rat(1, 1); }

Amount
  // 1 1/2, 1-1/2
  = whole:Integer (__ / "-") numerator:Integer _ "/" _ denominator:Integer
    { return rat(whole * denominator + numerator, denominator); }
  // 1/2
  / numerator:Integer _ "/" _ denominator:Integer
    { return rat(numerator, denominator); }
  // 1.5, and the European 1,5
  / whole:$[0-9]* [.,] fraction:$[0-9]+
    {
      const scale = 10 ** fraction.length;
      return rat(Number(whole || "0") * scale + Number(fraction), scale);
    }
  / value:Integer { return rat(value, 1); }
  / NumberWord

Integer
  = digits:$[0-9]+ { return Number(digits); }

NumberWord
  = "half"i End { return rat(1, 2); }
  / "quarter"i End { return rat(1, 4); }
  / "third"i End { return rat(1, 3); }
  / "single"i End { return rat(1, 1); }
  / "one"i End { return rat(1, 1); }
  / "two"i End { return rat(2, 1); }
  / "three"i End { return rat(3, 1); }
  / "four"i End { return rat(4, 1); }
  / "five"i End { return rat(5, 1); }
  / "six"i End { return rat(6, 1); }
  / "seven"i End { return rat(7, 1); }
  / "eight"i End { return rat(8, 1); }
  / "nine"i End { return rat(9, 1); }
  / "ten"i End { return rat(10, 1); }
  / "eleven"i End { return rat(11, 1); }
  / "twelve"i End { return rat(12, 1); }
  / "thirteen"i End { return rat(13, 1); }
  / "fourteen"i End { return rat(14, 1); }
  / "fifteen"i End { return rat(15, 1); }
  / "sixteen"i End { return rat(16, 1); }
  / "seventeen"i End { return rat(17, 1); }
  / "eighteen"i End { return rat(18, 1); }
  / "nineteen"i End { return rat(19, 1); }
  / "twenty"i End { return rat(20, 1); }
  / "thirty"i End { return rat(30, 1); }
  / "forty"i End { return rat(40, 1); }
  / "fifty"i End { return rat(50, 1); }
  / "sixty"i End { return rat(60, 1); }
  / "seventy"i End { return rat(70, 1); }
  / "eighty"i End { return rat(80, 1); }
  / "ninety"i End { return rat(90, 1); }
  / "hundred"i End { return rat(100, 1); }

/*----------  Lexical helpers  ----------*/

Of
  = "of"i End

Each
  = _ "each"i End

End
  = ![a-z0-9'\u00C0-\u024F]i

_
  = " "*

__
  = " "+
