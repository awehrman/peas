# @peas/parser

Recipe parsing and grammar system for the Peas project.

## Overview

This package provides a custom parser for recipe formats using Peggy.js. It can parse various recipe formats and convert them into structured data.

## Features

- **Custom grammar** for recipe parsing
- **Peggy.js** parser generator
- **Multiple format support** for recipe inputs
- **Structured output** for recipe data

## Installation

```bash
yarn add @peas/parser
```

## Usage

```javascript
import { parseRecipe } from "@peas/parser";

const recipeText = `
Title: Chocolate Chip Cookies
Ingredients:
- 2 cups flour
- 1 cup sugar
Instructions:
1. Mix ingredients
2. Bake at 350°F
`;

const parsedRecipe = parseRecipe(recipeText);
console.log(parsedRecipe);
```

## Development

```bash
# Install dependencies
yarn install

# Build the parser
yarn build

# Watch for changes
yarn dev
```

## Grammar

The parser uses a custom grammar defined in `src/grammar.peggy` that supports:

- Recipe titles and metadata
- Ingredient lists with quantities
- Step-by-step instructions
- Cooking times and temperatures

## Integration

This package is used by:

- `@peas/queue` - For processing recipe imports
- `@peas/web` - For parsing uploaded recipe files

## Learn More

- [Peggy.js](https://peggyjs.org/)
- [Parsing Expression Grammars](https://en.wikipedia.org/wiki/Parsing_expression_grammar)
