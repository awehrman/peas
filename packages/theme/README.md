# @peas/theme

A comprehensive design system theme package that provides colors, typography, spacing, and other design tokens for the Peas application.

## Overview

This package contains the core design tokens that power the visual design of the Peas application. It provides a consistent color system, typography scale, spacing system, and other design elements that ensure visual consistency across all components.

## Installation

```bash
yarn add @peas/theme
```

## Color System

The color system is built around a semantic approach where colors have specific meanings and use cases.

### Color Types

#### ColorWithForeground

Colors that have both a main color and a contrasting text color:

```typescript
{
  DEFAULT: string; // Main color (background, border, etc.)
  foreground: string; // Text color that contrasts with DEFAULT
}
```

#### ColorScale

A range of color shades from light to dark:

```typescript
{
  50: string;   // Lightest
  100: string;
  200: string;
  // ... up to
  950: string;  // Darkest
}
```

### Available Colors

#### Primary Colors

The main brand color (green):

```typescript
primary: {
  DEFAULT: "oklch(50.0% 0.0900 127.79)",  // Green background
  foreground: "#ffffff",                   // White text
  // ... plus 50-950 scale
}
```

**Usage:**

```tsx
// Primary button
<button className="bg-primary text-primary-foreground">
  Primary Action
</button>

// Primary border
<div className="border border-primary">
  Content with green border
</div>
```

#### Secondary Colors

Secondary brand color (purple):

```typescript
secondary: {
  DEFAULT: "oklch(50.0% 0.0300 335.85)",  // Purple background
  foreground: "#ffffff",                   // White text
  // ... plus 50-950 scale
}
```

#### Semantic Colors

**Success (Green):**

```tsx
<div className="bg-success text-success-foreground">Success message</div>
```

**Warning (Yellow):**

```tsx
<div className="bg-warning text-warning-foreground">Warning message</div>
```

**Error (Red):**

```tsx
<div className="bg-error text-error-foreground">Error message</div>
```

**Info (Blue):**

```tsx
<div className="bg-info text-info-foreground">Information message</div>
```

#### Neutral Colors

**Background & Foreground:**

```typescript
background: "#ffffff",                    // Pure white background
foreground: "oklch(50.0% 0.0900 127.79)" // Primary green text
```

**Usage:**

```tsx
// Default page styling
<div className="bg-background text-foreground">
  Main content with white background and green text
</div>
```

**Card Colors:**

```typescript
card: {
  DEFAULT: "oklch(97.0% 0.0382 96.53)",   // Very light gray
  foreground: "oklch(20.0% 0.0382 96.53)" // Dark gray text
}
```

**Usage:**

```tsx
// Card component
<div className="bg-card text-card-foreground border border-border">
  Card content with subtle gray background
</div>
```

**Muted Colors:**

```typescript
muted: {
  DEFAULT: "oklch(95.0% 0.0382 96.53)",   // Light gray
  foreground: "oklch(30.0% 0.0382 96.53)" // Medium gray text
}
```

**Usage:**

```tsx
// Disabled or secondary content
<div className="bg-muted text-muted-foreground">
  Disabled or secondary content
</div>
```

**Popover Colors:**

```typescript
popover: {
  DEFAULT: "oklch(98.0% 0.0382 96.53)",   // Almost white
  foreground: "oklch(20.0% 0.0382 96.53)" // Dark gray text
}
```

**Usage:**

```tsx
// Dropdown or tooltip
<div className="bg-popover text-popover-foreground border border-border shadow-lg">
  Dropdown content
</div>
```

#### Color Scales

**Greyscale:**

```typescript
greyscale: {
  50: "oklch(90.7% 0.013 150.5)",   // Lightest
  100: "oklch(80.7% 0.017 150.5)",
  // ... up to
  950: "oklch(10.7% 0.002 150.5)"   // Darkest
}
```

**Usage:**

```tsx
// Different shades of gray
<div className="bg-greyscale-100 text-greyscale-800">
  Light gray background with dark gray text
</div>
```

**Neutrals:**

```typescript
neutrals: {
  50: "oklch(100.0% 0.0382 96.53)",  // Lightest
  100: "oklch(95.0% 0.0382 96.53)",
  // ... up to
  950: "oklch(20.0% 0.0382 96.53)"   // Darkest
}
```

### Color Hierarchy

The color system creates a visual hierarchy:

1. **`background`** - Pure white (`#ffffff`) - Main page background
2. **`popover`** - Almost white (`oklch(98.0% 0.0382 96.53)`) - Overlays
3. **`card`** - Very light gray (`oklch(97.0% 0.0382 96.53)`) - Cards
4. **`muted`** - Light gray (`oklch(95.0% 0.0382 96.53)`) - Secondary content

## Typography

The typography system provides consistent font sizes and weights:

```typescript
// Font families
--font-family-sans: var(--font-source-sans), sans-serif;
--font-family-mono: JetBrains Mono, monospace;

// Font sizes
--font-size-xs: 0.75rem;    // 12px
--font-size-sm: 0.875rem;   // 14px
--font-size-base: 1rem;     // 16px
--font-size-lg: 1.125rem;   // 18px
--font-size-xl: 1.25rem;    // 20px
--font-size-2xl: 1.5rem;    // 24px
--font-size-3xl: 1.875rem;  // 30px
--font-size-4xl: 2.25rem;   // 36px
--font-size-5xl: 3rem;      // 48px
--font-size-6xl: 3.75rem;   // 60px
--font-size-7xl: 4.5rem;    // 72px
--font-size-8xl: 6rem;      // 96px
--font-size-9xl: 8rem;      // 128px

// Font weights
--font-weight-thin: 100;
--font-weight-extralight: 200;
--font-weight-light: 300;
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
--font-weight-extrabold: 800;
--font-weight-black: 900;
```

## Spacing

Consistent spacing scale for margins, padding, and gaps:

```typescript
--spacing-0: 0px;
--spacing-1: 4px;
--spacing-2: 8px;
--spacing-3: 12px;
--spacing-4: 16px;
--spacing-5: 20px;
--spacing-6: 24px;
--spacing-8: 32px;
--spacing-10: 40px;
--spacing-12: 48px;
--spacing-16: 64px;
--spacing-20: 80px;
--spacing-24: 96px;
--spacing-32: 128px;
--spacing-40: 160px;
--spacing-48: 192px;
--spacing-56: 224px;
--spacing-64: 256px;
--spacing-72: 288px;
--spacing-80: 320px;
--spacing-96: 384px;
```

## Breakpoints

Responsive design breakpoints:

```typescript
--breakpoint-sm: 640px;   // Small devices
--breakpoint-md: 768px;   // Medium devices
--breakpoint-lg: 1024px;  // Large devices
--breakpoint-xl: 1280px;  // Extra large devices
--breakpoint-2xl: 1536px; // 2X large devices
```

## Shadows

Elevation and depth system:

```typescript
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
--shadow-inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);
--shadow-none: none;
```

## Usage Examples

### Complete Component Example

```tsx
import React from "react";

const ExampleCard = () => {
  return (
    <div className="bg-card text-card-foreground border border-border rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold text-foreground mb-4">
        Card Title
      </h2>
      <p className="text-muted-foreground mb-4">
        This is a card with proper color hierarchy and spacing.
      </p>
      <div className="flex gap-3">
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90">
          Primary Action
        </button>
        <button className="bg-background text-foreground border border-primary px-4 py-2 rounded-md hover:bg-muted">
          Secondary Action
        </button>
      </div>
    </div>
  );
};
```

### Form Example

```tsx
const ExampleForm = () => {
  return (
    <form className="bg-background text-foreground p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Email
        </label>
        <input
          className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring"
          type="email"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
        >
          Submit
        </button>
        <button
          type="button"
          className="bg-muted text-muted-foreground px-4 py-2 rounded-md hover:bg-muted/80"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
```

### Alert Example

```tsx
const AlertExample = () => {
  return (
    <div className="space-y-4">
      {/* Success Alert */}
      <div className="bg-success text-success-foreground p-4 rounded-lg">
        Success! Your action was completed.
      </div>

      {/* Warning Alert */}
      <div className="bg-warning text-warning-foreground p-4 rounded-lg">
        Warning! Please check your input.
      </div>

      {/* Error Alert */}
      <div className="bg-error text-error-foreground p-4 rounded-lg">
        Error! Something went wrong.
      </div>

      {/* Info Alert */}
      <div className="bg-info text-info-foreground p-4 rounded-lg">
        Info: Here's some helpful information.
      </div>
    </div>
  );
};
```

## Integration with Tailwind CSS

This theme package integrates seamlessly with Tailwind CSS through the `@peas/tailwind` package, which generates CSS variables and Tailwind configuration.

### CSS Variables

All colors are available as CSS variables:

```css
:root {
  --color-primary: oklch(50% 0.09 127.79);
  --color-primary-foreground: #ffffff;
  --color-background: #ffffff;
  --color-foreground: oklch(50% 0.09 127.79);
  /* ... and many more */
}
```

### Tailwind Classes

Use the colors with standard Tailwind classes:

```tsx
// Background colors
<div className="bg-primary bg-secondary bg-success bg-warning bg-error bg-info">
<div className="bg-background bg-card bg-muted bg-popover">

// Text colors
<p className="text-primary-foreground text-secondary-foreground">
<p className="text-foreground text-card-foreground text-muted-foreground">

// Border colors
<div className="border border-primary border-border border-input">
```

## Development

### Building the Theme

```bash
yarn build
```

### Watching for Changes

```bash
yarn watch
```

### Regenerating CSS

After making changes to the theme, rebuild the CSS:

```bash
cd ../tailwind && yarn build
```

## Best Practices

1. **Use semantic colors** - Prefer `bg-primary` over `bg-green-500`
2. **Maintain contrast** - Always use `foreground` colors with their corresponding backgrounds
3. **Follow hierarchy** - Use `background` for main areas, `card` for elevated content
4. **Be consistent** - Use the same color patterns across similar components
5. **Test accessibility** - Ensure sufficient contrast ratios for all color combinations

## Contributing

When adding new colors or modifying existing ones:

1. Update the TypeScript definitions in `src/colors.ts`
2. Add appropriate documentation
3. Update this README with examples
4. Test the changes across different components
5. Ensure accessibility compliance

## License

This package is part of the Peas project and follows the same licensing terms.
