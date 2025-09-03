# @peas/pea-svg-generator

SVG generator for creating pea-themed graphics and icons.

## Overview

This package provides tools for generating SVG graphics with pea-themed designs. It can create various pea patterns, icons, and decorative elements for use in the Peas application.

## Features

- **Pea pattern generation** - Create repeating pea patterns with customizable layouts
- **Blob pea generation** - Create organic, cute blob-shaped peas using CSS shape() function approach
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

// Create a generator instance for regular peas
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

// Create blob peas (organic shapes)
const blobGenerator = new PeaGenerator({
  width: 1000,
  height: 1000,
  peasPerRow: 3,
  margin: 50,
  useBlobs: true, // Enable blob generation
});

// Generate blob pea configurations
const blobConfigs = blobGenerator.generatePeaConfigs();
```

### CLI

```bash
# Generate regular peas
npx @peas/pea-svg-generator

# Generate blob peas (organic shapes)
npx @peas/pea-svg-generator --blobs

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
  useBlobs?: boolean; // Enable organic blob shapes
}

class PeaGenerator {
  constructor(options: PeaGeneratorOptions);
  generatePeaConfigs(): PeaConfig[] | BlobPeaConfig[];
  peaConfigToSVG(config: PeaConfig): string;
}
```

### BlobGenerator

The class for generating organic blob-shaped peas.

```typescript
class BlobGenerator {
  constructor(seed?: number);
  generateBlobPath(width: number, height: number, complexity?: number): string;
  generatePeaBlob(config: BlobPeaConfig): string;
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

- `@peas/components` - For PhysicsBackground component
- `@peas/web` - For decorative elements
- `@peas/docs` - For documentation graphics

## Learn More

- [SVG](https://developer.mozilla.org/en-US/docs/Web/SVG)
- [Command Line Interfaces](https://nodejs.org/api/readline.html)
