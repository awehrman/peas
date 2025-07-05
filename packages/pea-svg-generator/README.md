# @peas/pea-svg-generator

SVG generator for creating pea-themed graphics and icons.

## Overview

This package provides tools for generating SVG graphics with pea-themed designs. It can create various pea patterns, icons, and decorative elements.

## Features

- **Pea pattern generation** - Create repeating pea patterns
- **Color customization** - Configurable color palettes
- **Size variations** - Different sizes and scales
- **CLI interface** - Command-line tool for generation

## Installation

```bash
yarn add @peas/pea-svg-generator
```

## Usage

### CLI

```bash
# Generate a basic pea pattern
npx @peas/pea-svg-generator

# Generate with custom colors
npx @peas/pea-svg-generator --colors green,lightgreen,darkgreen

# Generate small peas
npx @peas/pea-svg-generator --size small
```

### Programmatic

```javascript
import { generatePeaPattern } from "@peas/pea-svg-generator";

const svg = generatePeaPattern({
  colors: ["#4ade80", "#22c55e", "#16a34a"],
  size: "medium",
  pattern: "random",
});

console.log(svg);
```

## Development

```bash
# Install dependencies
yarn install

# Build the package
yarn build

# Run the CLI
yarn cli
```

## Output

The generator creates SVG files with:

- `generated-peas.svg` - Large pea pattern
- `small-peas.svg` - Small pea pattern

## Integration

This package is used by:

- `@peas/web` - For decorative elements
- `@peas/docs` - For documentation graphics

## Learn More

- [SVG](https://developer.mozilla.org/en-US/docs/Web/SVG)
- [Command Line Interfaces](https://nodejs.org/api/readline.html)
