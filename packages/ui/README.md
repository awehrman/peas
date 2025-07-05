# @peas/ui

Design system and UI component library for the Peas project.

## Overview

This package provides a comprehensive design system with reusable UI components built using:

- **React 18** with TypeScript
- **Tailwind CSS v4** for styling
- **shadcn/ui** components as primitives
- **Atomic Design** methodology
- **Lucide React** for icons

## Architecture

The components are organized using Atomic Design principles:

```
src/components/
├── ui/           # shadcn/ui primitives (Button, Card, etc.)
├── atoms/        # Basic building blocks (Spinner, NavButton, etc.)
├── molecules/    # Simple combinations (FileUpload, Header, etc.)
├── organisms/    # Complex components (Navigation, DesignSystem, etc.)
└── contexts/     # React contexts (NavigationContext, etc.)
```

## Installation

```bash
yarn add @peas/ui
```

## Usage

```tsx
import { Button, FileUpload, Navigation } from "@peas/ui";

function MyComponent() {
  return (
    <div>
      <Button>Click me</Button>
      <FileUpload onUpload={handleUpload} />
      <Navigation />
    </div>
  );
}
```

## Available Components

### Atoms

- `Spinner` - Loading indicator
- `NavButton` - Navigation button with variants
- `NavIcon` - Icon wrapper for navigation
- `NavLink` - Navigation link component

### Molecules

- `FileUpload` - File upload with drag & drop
- `Header` - Page header component
- `Placeholder` - Empty state placeholder
- `NavItem` - Navigation item with icon
- `NavToggle` - Navigation toggle button

### Organisms

- `Navigation` - Complete navigation system
- `DesignSystem` - Design system showcase

### UI (shadcn/ui)

- `Button` - Primary button component
- Additional shadcn components as needed

## Development

```bash
# Install dependencies
yarn install

# Build the package
yarn build

# Watch for changes
yarn dev
```

## Styling

The package uses Tailwind CSS v4 with custom design tokens from `@peas/theme`. All components are styled using utility classes and CSS custom properties.

## Learn More

- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [Atomic Design](https://bradfrost.com/blog/post/atomic-web-design/)
