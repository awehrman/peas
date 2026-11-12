# Legacy parsers (reference only)

Nothing in this folder is built, exported, linted, tested, or imported. It is kept so earlier grammar work stays available while the v2 parser (`src/v2`) replaces v1.

- `v2-stub/grammar.peggy` - an early grammar stub that predates the current v2 parser and was never used outside this package. It was renamed so it doesn't collide with `src/v2`.
- `dynamic/` - the runtime-compiled grammar tooling that turned database-edited rules (`GrammarRule`, `GrammarRuleDefinition`) into a Peggy parser, plus its seed rules and output normalizer.
- `dynamic-archive/` - rules, tests, published versions, and parser settings exported from the database by `packages/database/scripts/export-grammar-archive.js` before the grammar tables were dropped.

The v1 grammar (`src/v1/parser.peggy`) stays in place while it is the live import parser; it moves to `legacy/v1/` once v2 replaces it.
