# @peas/typescript-config

Shared TypeScript configuration for the Peas project.

## Overview

This package provides shared TypeScript configuration files that are extended by all packages and applications in the Peas monorepo.

## Available Configurations

### Base Configuration

- `base.json` - Base TypeScript configuration for all packages

### React Library Configuration

- `react-library.json` - Configuration for React component libraries

### Next.js Configuration

- `nextjs.json` - Configuration for Next.js applications

## Usage

Extend the base configuration in your `tsconfig.json`:

```json
{
  "extends": "@peas/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

For React libraries:

```json
{
  "extends": "@peas/typescript-config/react-library.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

For Next.js applications:

```json
{
  "extends": "@peas/typescript-config/nextjs.json",
  "compilerOptions": {
    "plugins": [
      {
        "name": "next"
      }
    ]
  }
}
```

## Development

```bash
# Install dependencies
yarn install

# Type check
yarn typecheck
```

## Integration

This package is used by:

- All packages in the monorepo
- All applications for consistent TypeScript configuration

## Learn More

- [TypeScript Configuration](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
- [Next.js TypeScript](https://nextjs.org/docs/basic-features/typescript)
