# Peas Web App

The main web application for the Peas project - a recipe management and design system.

## Overview

This is a [Next.js](https://nextjs.org) application that provides the user interface for managing recipes, ingredients, and design systems. It's built with:

- **Next.js 15** with App Router
- **Tailwind CSS v4** for styling
- **shadcn/ui** components
- **@peas/components** design system components
- **@peas/features** feature components
- **PhysicsBackground** animated backgrounds with bouncing peas

## Getting Started

First, install dependencies from the root:

```bash
yarn install
```

Then run the development server:

```bash
yarn dev
# or from root: yarn workspace @peas/web dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Pages

- `/` - Home page
- `/recipes` - Recipe management
- `/ingredients` - Ingredient management
- `/design` - Design system showcase
- `/import` - Recipe import functionality
- `/notes` - Notes and documentation
- `/login` - Authentication
- `/logout` - Logout

## Development

The app uses the shared packages from the monorepo:

- `@peas/components` - Design system components
- `@peas/features` - Feature-specific components
- `@peas/database` - Database client and types
- `@peas/theme` - Design tokens and theming

## Build

```bash
yarn build
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
