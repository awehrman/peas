# Peas Queue

A Node.js queue processing application for handling background jobs in the Peas project.

## Overview

This is a standalone Node.js application that processes background jobs and tasks for the Peas project. It handles:

- **Recipe parsing** and processing
- **Import jobs** from external sources
- **Data synchronization** tasks
- **Background processing** for heavy operations

## Getting Started

First, install dependencies from the root:

```bash
yarn install
```

Then run the development server:

```bash
yarn dev
# or from root: yarn workspace @peas/queue dev
```

## Development

The queue app uses the shared packages from the monorepo:

- `@peas/database` - Database client and types
- `@peas/parser` - Recipe parsing functionality

## Configuration

The app requires:

- **Redis** - For job queue management
- **Database** - For job persistence and results

## Build

```bash
yarn build
```

## Learn More

- [Node.js](https://nodejs.org/docs)
- [Redis](https://redis.io/documentation)
