# Peas - Recipe Parsing Platform

qqyarn

## 🎯 MVP Overview

Peas is designed to transform unstructured recipe content into structured, searchable data through a sophisticated queue-based processing pipeline.

### Core Features

- **HTML Recipe Import**: Upload and process recipe HTML files
- **Intelligent Parsing**: Extract ingredients and instructions using PEG grammar
- **Queue-Based Processing**: Scalable background job processing with BullMQ
- **Real-time Status Tracking**: Monitor processing progress and handle errors
- **Modern UI**: Built with Next.js and shadcn/ui components

## 🏗️ Architecture

### Frontend (`apps/web`)

- **Import Route** (`/import`): Upload HTML recipe files
- **File Upload**: Accept HTML files with drag-and-drop interface
- **Status Tracking**: Real-time processing status updates
- **Recipe Management**: View and manage processed recipes

### API Layer

- **`/notes/import`**: Process uploaded HTML files
  - Save note content and metadata to database
  - Mock image upload with placeholder URLs
  - Queue processing jobs for background execution
  - Update note status throughout processing pipeline

### Queue Processing Pipeline

#### 1. **Process Note Queue**

- Parse HTML structure to identify ingredient and instruction lines
- Save parsed lines as `ParsedIngredientLine` and `ParsedInstructionLine` records
- Queue individual lines for specialized processing
- Update note status to `PROCESSING_INGREDIENTS`

#### 2. **Ingredient Line Processor Queue**

- Process each ingredient line through PEG grammar parser
- Generate structured `ParsedSegment` records with ingredient details
- Handle parsing errors and update error tracking
- Update note status to `PROCESSING_INSTRUCTIONS`

#### 3. **Instruction Line Processor Queue**

- Apply spellcheck and text normalization to instruction lines
- Clean and standardize instruction text
- Update `normalizedText` field with processed content
- Mark note as `COMPLETED` or `FAILED`

## 📁 Project Structure

```text
peas/
├── apps/
│   ├── docs/          # Documentation site (Next.js)
│   ├── queue/         # BullMQ queue processor
│   └── web/           # Main web application (Next.js)
├── packages/
│   ├── database/      # Prisma database client and schema
│   ├── eslint-config/ # Shared ESLint configuration
│   ├── parser/        # PEG grammar recipe parser
│   ├── pea-svg-generator/ # SVG generation for pea graphics
│   ├── storybook/     # Component development environment
│   ├── tailwind/      # Shared Tailwind CSS configuration
│   ├── theme/         # Design system tokens and configuration
│   ├── typescript-config/ # Shared TypeScript configuration
│   └── ui/            # Shared UI components with shadcn/ui
├── scripts/           # Build and utility scripts
└── turbo.json         # Turborepo configuration
```

## 🎨 Design System

The project uses a comprehensive design system built with:

- **shadcn/ui**: Modern, accessible React components
- **Tailwind CSS**: Utility-first CSS framework
- **Custom Theme Package**: Centralized design tokens
- **Storybook**: Component development and documentation
- **PhysicsBackground**: Animated physics background with bouncing peas
- **Pea SVG Generator**: Dynamic SVG generation for pea graphics

### Component Architecture

- **Atoms**: Basic UI elements (buttons, inputs, icons)
- **Molecules**: Compound components (navigation items, form fields)
- **Organisms**: Complex UI sections (headers, navigation, forms, physics backgrounds)
- **Templates**: Page layouts and compositions

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 18.18.0+ (required for Next.js)
- **Yarn**: 4.9.1+ (package manager)
- **PostgreSQL**: Database for recipe storage
- **Redis**: Queue processing with BullMQ

### Environment Setup

1. **Copy environment files**:

   ```bash
   cp .env.example .env
   cp apps/web/.env.example apps/web/.env
   cp apps/queue/.env.example apps/queue/.env
   cp packages/database/.env.example packages/database/.env
   ```

2. **Configure environment variables**:
   - `DATABASE_URL`: PostgreSQL connection string
   - `REDISHOST`, `REDISPORT`: Redis connection details
   - `NEXTAUTH_SECRET`: Authentication secret
   - `GITHUB_ID`, `GITHUB_SECRET`: OAuth credentials

### Installation

```bash
# Install dependencies
yarn install

# Generate Prisma client
cd packages/database && npx prisma generate

# Run database migrations
cd packages/database && npx prisma migrate dev

# Build all packages
yarn build
```

### Development

```bash
# Start all apps in development mode
yarn dev

# Start specific applications
yarn workspace @peas/web dev      # Main web app
yarn workspace @peas/queue dev    # Queue processor
yarn workspace @peas/docs dev     # Documentation
```

### Queue Processing

```bash
# Start the queue processor
yarn workspace @peas/queue dev

# Monitor queue status
curl http://localhost:4200/health
```

### Component Development

```bash
# Start Storybook
yarn workspace @peas/storybook dev

# Build Storybook static site
yarn workspace @peas/storybook build-storybook
```

## 🧪 Testing

```bash
# Run all tests
yarn test

# Run specific test suites
yarn workspace @peas/web test
yarn workspace @peas/queue test
```

## 📊 Database Schema

The application uses Prisma with PostgreSQL and includes:

- **User Management**: Authentication and user profiles
- **Note Processing**: Recipe content and metadata storage
- **Queue Jobs**: Background job tracking and error handling
- **Parsed Content**: Structured ingredient and instruction data
- **Error Tracking**: Comprehensive error logging and recovery

### Key Models

- `Note`: Recipe content and processing status
- `ParsedIngredientLine`: Extracted ingredient information
- `ParsedInstructionLine`: Processed instruction text
- `QueueJob`: Background job management
- `ParsedSegment`: Structured ingredient data

## 🔧 Development Workflow

### Adding New Features

1. Create feature branch from `main`
2. Implement changes in appropriate packages
3. Update tests and documentation
4. Run linting and type checking
5. Submit pull request

### Database Changes

1. Update `packages/database/prisma/schema.prisma`
2. Generate migration: `npx prisma migrate dev --name "description"`
3. Update Prisma client: `npx prisma generate`
4. Test with sample data

### Component Development

1. Create component in `packages/components/src/components/`
2. Add Storybook stories for testing
3. Export from package index
4. Import and use in applications

## 🚀 Deployment

### Production Build

```bash
# Build all packages
yarn build

# Generate production Prisma client
cd packages/database && npx prisma generate

# Deploy database migrations
cd packages/database && npx prisma migrate deploy
```

### Environment Variables

Ensure all production environment variables are configured:

- Database connection strings
- Redis configuration
- OAuth credentials
- API keys and secrets

## 📚 Documentation

- **API Documentation**: Available at `/docs` when running the docs app
- **Component Library**: Storybook for UI component documentation
- **Database Schema**: Prisma schema documentation
- **Queue Processing**: BullMQ dashboard at `/bull-board`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests and documentation
5. Submit a pull request

## 📄 License

[MIT](LICENSE) - See LICENSE file for details

---

**Peas** - Transforming recipes into structured data, one ingredient at a time.
