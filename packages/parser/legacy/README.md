# Legacy parsers (reference only)

Nothing in this folder is built, exported, linted, tested, or imported. It is
kept so earlier grammar work stays available while v3 (`src/v3`) replaces it.

- `v2/grammar.peggy` - early v2 grammar stub (never used outside this package).
- `dynamic/` - the runtime-compiled grammar tooling that turned
  database-edited rules (`GrammarRule`, `GrammarRuleDefinition`) into a Peggy
  parser, plus its seed rules and output normalizer.
- `dynamic-archive/` - rules, tests, published versions, and parser settings
  exported from the database by
  `packages/database/scripts/export-grammar-archive.js` before the grammar
  tables were dropped.

The v1 grammar (`src/v1/parser.peggy`) stays in place while it is the live
import parser; it moves to `legacy/v1/` once v3 replaces it.
