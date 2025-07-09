# @peas/auth

Authentication utilities and Lucia configuration for the Peas application.

## Features

- Lucia authentication setup with Prisma adapter
- Session management utilities
- Cookie handling for Next.js
- User ownership validation

## Usage

```typescript
import { lucia, createSession } from "@peas/auth";
import { setSessionCookie } from "@peas/auth/session-cookie";
import { isOwner } from "@peas/auth/is-owner";
```

## Development

```bash
# Install dependencies
yarn install

# Build the package
yarn build

# Type checking
yarn typecheck

# Development mode with watch
yarn dev
```
