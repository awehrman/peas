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

To create an account and make it an admin, see [SIGN_UP_CODES.md](./SIGN_UP_CODES.md).

## Available Pages

- `/` - Dashboard (admin data tools)
- `/import` - Upload Evernote exports (.zip or folder) and watch the queue
- `/notes`, `/notes/[id]` - Imported notes with parsed ingredient lines
- `/ingredients` - Browse, group, review and edit ingredients
- `/recipes`, `/recipes/[id]` - Recipes promoted from notes
- `/parser` - Grammar rule builder, grammar tests and the import parser switch (admins)
- `/design` - Design system showcase
- `/login` - Sign in (sign out is in the navigation)
- `/invite/[code]` - Sign up with a code from `SIGN_UP_CODES`

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
