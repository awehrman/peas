# @peas/theme

Design tokens and theming system for the Peas project.

## Overview

This package provides design tokens, color palettes, typography, spacing, and other design system foundations used across the Peas applications.

## Features

- **Color palettes** - Primary, secondary, and semantic colors
- **Typography** - Font families, sizes, and weights
- **Spacing** - Consistent spacing scale
- **Shadows** - Elevation and depth tokens
- **Breakpoints** - Responsive design breakpoints

## Installation

```bash
yarn add @peas/theme
```

## Usage

```tsx
import { colors, typography, spacing } from "@peas/theme";

// Use design tokens in your components
const styles = {
  color: colors.primary[500],
  fontSize: typography.sizes.lg,
  padding: spacing[4],
};
```

## Available Tokens

### Colors

- `colors.primary` - Primary brand colors
- `colors.secondary` - Secondary brand colors
- `colors.neutral` - Neutral grays
- `colors.semantic` - Success, warning, error colors

### Typography

- `typography.families` - Font families
- `typography.sizes` - Font sizes
- `typography.weights` - Font weights

### Spacing

- `spacing` - Consistent spacing scale (0-16)

### Shadows

- `shadows` - Elevation and depth shadows

### Breakpoints

- `breakpoints` - Responsive design breakpoints

## Development

```bash
# Install dependencies
yarn install

# Build the package
yarn build

# Watch for changes
yarn dev
```

## Integration

This package is used by:

- `@peas/ui` - Design system components
- `@peas/features` - Feature components
- All applications for consistent theming

## Learn More

- [Design Tokens](https://www.designtokens.org/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
