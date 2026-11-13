# Legacy parsers (reference only)

Nothing in this folder is built, exported, linted, tested, or imported. It keeps earlier grammar work available now that the v2 parser (`src/v2`) is the only parser.

- `v1/parser.peggy` - the original import parser, retired when imports moved to v2. `src/v2/grammar/ingredient-line.peggy` was ported from it. `v1/scripts/baseline-v1.js` (with `ensure-v1.js`, which compiles the grammar into the git-ignored `v1/build/`) regenerates `fixtures/baseline/v1.jsonl` by hand from the package root: `node legacy/v1/scripts/baseline-v1.js`. `yarn extract:descriptors` still reads this grammar's DESCRIPTORS list.
- `v2-stub/grammar.peggy` - an early grammar stub that predates the current v2 parser and was never used outside this package. It was renamed so it doesn't collide with `src/v2`.
- `dynamic/` - the runtime-compiled grammar tooling that turned database-edited rules (`GrammarRule`, `GrammarRuleDefinition`) into a Peggy parser, plus its seed rules and output normalizer. Its test imports the old `@peas/parser/v1` entry point, which no longer exists.
- `dynamic-archive/` - rules, tests, published versions, and parser settings exported from the database by `packages/database/scripts/export-grammar-archive.js` before the grammar tables were dropped.
