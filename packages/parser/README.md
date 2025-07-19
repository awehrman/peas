# @peas/parser

Recipe parsing and grammar system for the Peas project.

## Overview

This package provides custom parsers for recipe formats using Peggy.js. It supports multiple versions of the parser and can parse various recipe formats into structured data.

## Features

- **Multiple parser versions** (v1 and v2)
- **Custom grammar** for recipe parsing
- **Peggy.js** parser generator
- **Minified builds** for production use
- **Multiple format support** for recipe inputs
- **Structured output** for recipe data

## Installation

```bash
yarn add @peas/parser
```

## Usage

### Default (Latest Version)

```javascript
import { parse } from "@peas/parser";

const recipeText = `
Title: Chocolate Chip Cookies
Ingredients:
- 2 cups flour
- 1 cup sugar
Instructions:
1. Mix ingredients
2. Bake at 350°F
`;

const parsedRecipe = parse(recipeText);
console.log(parsedRecipe);
```

### Specific Version

```javascript
// Use v1 parser
import { v1 } from "@peas/parser";
const result1 = v1.parse(recipeText);

// Use v2 parser
import { v2 } from "@peas/parser";
const result2 = v2.parse(recipeText);
```

### Minified Versions

```javascript
// Import minified versions directly
import v1Parser from "@peas/parser/v1/minified";
import v2Parser from "@peas/parser/v2/minified";
```

## Development

```bash
# Install dependencies
yarn install

# Build all versions
yarn build

# Build specific version
yarn build:v1
yarn build:v2

# Build with minification
yarn build:minified

# Clean build artifacts
yarn clean
```

## Build Output

The build process creates the following structure in the `dist` folder:

```
dist/
├── index.js          # Main entry point (exports v2 as default)
├── v1/
│   ├── parser.js     # Generated v1 parser
│   ├── index.js      # V1 exports
│   └── index.min.js  # Minified v1 (after minify)
└── v2/
    ├── grammar.js    # Generated v2 parser
    ├── index.js      # V2 exports
    └── index.min.js  # Minified v2 (after minify)
```

## Grammar Files

- `src/v1/parser.peggy` - V1 parser grammar
- `src/v2/grammar.peggy` - V2 parser grammar

## Integration

This package is used by:

- `@peas/queue` - For processing recipe imports
- `@peas/web` - For parsing uploaded recipe files

## Learn More

- [Peggy.js](https://peggyjs.org/)
- [Parsing Expression Grammars](https://en.wikipedia.org/wiki/Parsing_expression_grammar)
