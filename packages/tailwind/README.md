# @peas/tailwind

Shared Tailwind CSS configuration and styles for the Peas project.

## Overview

This package provides the shared Tailwind CSS v4 configuration, custom styles, and build scripts used across all Peas applications and packages.

## Features

- **Tailwind CSS v4** configuration
- **Shared styles** and utilities
- **Build scripts** for CSS generation
- **PostCSS configuration** for v4 compatibility

## Installation

```bash
yarn add @peas/tailwind
```

## Usage

Import the shared styles in your application:

```css
@import "tailwindcss";
@import "@peas/tailwind/shared-styles.css";
```

## Development

```bash
# Install dependencies
yarn install

# Build shared styles
yarn build

# Watch for changes
yarn dev
```

## Configuration

The package includes:

- `postcss.config.mjs` - PostCSS configuration for Tailwind v4
- `shared-styles.css` - Shared CSS utilities and custom styles
- Build scripts for generating optimized CSS

## Integration

This package is used by:

- `@peas/ui` - Design system components
- `@peas/features` - Feature components
- All applications for consistent styling

## Learn More

- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [PostCSS](https://postcss.org/)
