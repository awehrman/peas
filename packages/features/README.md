# @peas/features

Feature-specific components that build on top of `@peas/components`.

## Overview

This package contains domain-specific components and features that are used across the Peas applications. These components are built using the design system from `@peas/components` and provide higher-level functionality.

## Architecture

Components are organized by feature domain:

```
src/components/
├── import/       # Recipe import functionality
│   ├── pending-review.tsx
│   ├── recently-imported.tsx
│   └── index.ts
└── index.ts      # Main exports
```

## Installation

```bash
yarn add @peas/features
```

## Usage

```tsx
import { PendingReview, RecentlyImported } from "@peas/features";

function ImportPage() {
  return (
    <div>
      <PendingReview items={pendingItems} />
      <RecentlyImported items={recentItems} />
    </div>
  );
}
```

## Available Features

### Import

- `PendingReview` - Shows items pending review after import
- `RecentlyImported` - Displays recently imported items

## Development

```bash
# Install dependencies
yarn install

# Build the package
yarn build

# Watch for changes
yarn dev

# Type check
yarn typecheck
```

## Dependencies

This package depends on:

- `@peas/components` - Design system components
- `@peas/theme` - Design tokens and theming

## Learn More

- [@peas/components](../ui/README.md) - Design system components
- [@peas/theme](../theme/README.md) - Design tokens
