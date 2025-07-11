# @peas/pea-svg-generator

SVG generator for creating pea-themed graphics and icons.

## Overview

This package provides tools for generating SVG graphics with pea-themed designs. It can create various pea patterns, icons, and decorative elements for use in the Peas application.

## Features

- **Pea pattern generation** - Create repeating pea patterns with customizable layouts
- **Color customization** - Configurable color palettes and themes
- **Size variations** - Different sizes and scales for various use cases
- **CLI interface** - Command-line tool for generation
- **TypeScript support** - Full TypeScript definitions
- **ESM and CJS builds** - Compatible with both module systems

## Installation

```bash
yarn add @peas/pea-svg-generator
```

## Usage

### Programmatic

```typescript
import { PeaGenerator } from "@peas/pea-svg-generator";

// Create a generator instance
const generator = new PeaGenerator({
  width: 1000,
  height: 1000,
  peasPerRow: 3,
  margin: 50,
});

// Generate pea configurations
const peaConfigs = generator.generatePeaConfigs();

// Convert a single pea config to SVG
const svg = generator.peaConfigToSVG(peaConfigs[0]);
```

### CLI

```bash
# Generate a basic pea pattern
npx @peas/pea-svg-generator

# Generate with custom colors
npx @peas/pea-svg-generator --colors green,lightgreen,darkgreen

# Generate small peas
npx @peas/pea-svg-generator --size small
```

## API Reference

### PeaGenerator

The main class for generating pea graphics.

```typescript
interface PeaGeneratorOptions {
  width: number;
  height: number;
  peasPerRow: number;
  margin: number;
}

class PeaGenerator {
  constructor(options: PeaGeneratorOptions);
  generatePeaConfigs(): PeaConfig[];
  peaConfigToSVG(config: PeaConfig): string;
}
```

### PeaConfig

Configuration for individual pea graphics.

```typescript
interface PeaConfig {
  rx: number;
  ry: number;
  // ... other properties
}
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

- `@peas/ui` - For PhysicsBackground component
- `@peas/web` - For decorative elements
- `@peas/docs` - For documentation graphics

## Learn More

- [SVG](https://developer.mozilla.org/en-US/docs/Web/SVG)
- [Command Line Interfaces](https://nodejs.org/api/readline.html)
