# Peas Documentation

Documentation site for the Peas project - built with Next.js and the shared design system.

## Overview

This is a [Next.js](https://nextjs.org) application that serves as the documentation site for the Peas project. It showcases:

- **Project documentation** and guides
- **Design system** examples and usage
- **Component library** documentation
- **API documentation** for packages

## Getting Started

First, install dependencies from the root:

```bash
yarn install
```

Then run the development server:

```bash
yarn dev
# or from root: yarn workspace @peas/docs dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development

The docs site uses the shared packages from the monorepo:

- `@peas/ui` - Design system components
- `@peas/theme` - Design tokens and theming

## Build

```bash
yarn build
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
