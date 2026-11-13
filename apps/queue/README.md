# Queue Service

A high-performance, scalable queue processing service built with TypeScript, Node.js, and BullMQ. This service handles HTML file processing, note parsing, ingredient extraction, and provides comprehensive monitoring and optimization capabilities.

## 🚀 Features

### Core Functionality

- **HTML File Processing**: Stream-based processing of HTML files with validation and error handling
- **Note Parsing**: Intelligent parsing of recipe notes with metadata extraction
- **Ingredient Processing**: v2 parsing and resolution of every ingredient line (mentions and discoveries, no legacy tables), cached per parser version and lexicon revision, with background reinterpretation after large Teach Peas decisions
- **Queue Management**: Robust job queue system with retry logic and error recovery
- **Real-time Monitoring**: WebSocket-based status updates and progress tracking

### Performance & Optimization

- **Performance Monitoring**: Comprehensive performance profiling and metrics collection
- **Memory Optimization**: Memory pooling, leak detection, and garbage collection management
- **Database Optimization**: Query caching, connection pooling, and batch operations
- **Caching System**: Multi-level caching with Redis and in-memory caches
- **Load Balancing**: Intelligent job distribution and worker scaling

### Security & Reliability

- **Security Middleware**: Comprehensive security headers, CORS, rate limiting, and request validation
- **Error Handling**: Standardized error handling with automatic recovery and retry logic
- **Health Monitoring**: Detailed health checks for all system components
- **Graceful Shutdown**: Proper cleanup and resource management on shutdown

### Developer Experience

- **TypeScript**: Full type safety and IntelliSense support
- **Modular Architecture**: Clean separation of concerns with dependency injection
- **Comprehensive Logging**: Structured logging with context-aware loggers
- **API Documentation**: RESTful APIs with detailed endpoint documentation
- **Testing Support**: Built-in testing utilities and test environment setup

## 📁 Project Structure

```text
src/
├── config/                 # Configuration management
│   ├── constants.ts       # Application constants
│   ├── database.ts        # Database configuration
│   ├── redis.ts          # Redis configuration
│   ├── factory.ts        # Manager factory pattern
│   └── standardized-config.ts # Standardized configuration system
├── middleware/            # Express middleware
│   ├── security.ts       # Security middleware
│   └── validation.ts     # Request validation
├── monitoring/           # System monitoring
│   ├── system-monitor.ts # System health monitoring
│   └── queue-monitor.ts  # Queue performance monitoring
├── parsers/              # Content parsing
│   └── html.ts          # HTML parsing utilities
├── routes/               # API routes
│   ├── import.ts        # File import endpoints
│   ├── notes.ts         # Note management endpoints
│   ├── health-enhanced.ts # Health check endpoints
│   ├── metrics.ts       # Metrics endpoints
│   ├── cache.ts         # Cache management endpoints
│   └── performance.ts   # Performance monitoring endpoints
├── services/             # Business logic services
│   ├── container.ts     # Dependency injection container
│   ├── factory.ts       # Service factory
│   ├── register-database.ts # Database service registration
│   ├── register-queues.ts # Queue service registration
│   ├── note/            # Note processing services
│   └── ingredient/      # Ingredient processing services
├── utils/                # Utility functions
│   ├── standardized-logger.ts # Standardized logging system
│   ├── standardized-error-handler.ts # Error handling system
│   ├── performance-optimizer.ts # Performance optimization
│   ├── database-optimizer.ts # Database optimization
│   ├── memory-optimizer.ts # Memory optimization
│   ├── file-processor.ts # File processing utilities
│   ├── error-handler.ts # Error handling utilities
│   └── metrics.ts       # Metrics collection
├── workers/              # Queue workers
│   ├── core/            # Core worker functionality
│   ├── note/            # Note processing workers
│   └── shared/          # Shared worker utilities
├── types.ts             # TypeScript type definitions
├── index.ts             # Application entry point
└── load-env.ts          # Environment loading
```

## 🛠️ Installation

### Prerequisites

- Node.js 18+
- Yarn package manager
- Redis server
- PostgreSQL database

### Setup

```bash
# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
yarn db:migrate

# Start the development server
yarn dev
```

## ⚙️ Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3000
HOST=localhost
WS_PORT=8080
WS_HOST=localhost

# Database Configuration
DATABASE_URL=postgresql://localhost:5432/peas
DB_MAX_CONNECTIONS=10
DB_CONNECTION_TIMEOUT=30000
DB_QUERY_TIMEOUT=10000

# Redis Configuration
REDISHOST=localhost
REDISPORT=6379
REDISUSERNAME=
REDISPASSWORD=
REDIS_DATABASE=0
REDIS_CONNECTION_TIMEOUT=5000
REDIS_RETRY_ATTEMPTS=3

# Queue Configuration
BATCH_SIZE=10
MAX_RETRIES=3
BACKOFF_MS=1000
MAX_BACKOFF_MS=30000
JOB_TIMEOUT=30000
CONCURRENCY=5

# Security Configuration
JWT_SECRET=your-jwt-secret-here
API_KEY=your-api-key-here
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_REQUEST_SIZE_BYTES=10485760

# Logging Configuration
LOG_LEVEL=info
ENABLE_FILE_LOGGING=true
ENABLE_CONSOLE_LOGGING=true
LOG_DIR=logs
MAX_LOG_SIZE_MB=10
MAX_LOG_FILES=5

# Monitoring Configuration
MONITORING_ENABLED=true
METRICS_RETENTION_HOURS=24
HEALTH_CHECK_INTERVAL_MS=30000
CLEANUP_INTERVAL_MS=3600000
MAX_METRICS_HISTORY=1000
```

## 🚀 Usage

### Starting the Service

```bash
# Development mode
yarn dev

# Production mode
yarn build
yarn start

# With performance profiling
NODE_OPTIONS="--expose-gc" yarn start
```

### v2 mention scripts

```bash
# Resolve every active ingredient line with the v2 parser and write mentions and discoveries (idempotent; resume with --after <lineId>)
yarn workspace @peas/queue backfill:mentions [--after <parsedLineId>] [--batch 500] [--mode CONSERVATIVE]

# Re-resolve lines whose mentions predate a lexicon revision; the API uses the reinterpret queue instead, and returns this command only when the queue is unreachable
yarn workspace @peas/queue reinterpret --revision <r> [--decision <decisionId>] [--batch 500]
```

Both scripts share `backfillMentions` in `@peas/database`, never write legacy tables, and leave verified mentions alone.

### v2 import pipeline (Phase 5)

- **Parse** (`services/ingredient/actions/parse-ingredient-line`): `processLine` runs `processIngredientLine` in CONSERVATIVE mode with the process's resolver context and stores the result as `metadata.v2Result`. Syntax decides the parse status (PARSED succeeds; PARTIAL and FAILED are errors); resolution never fails a job. Each parse is recorded in the last-hour metrics window. Logs `[V2_PARSE]`.
- **Save** (`save-ingredient-line`): `saveImportedLine` upserts the line by `(noteId, blockIndex, lineIndex)` and writes one mention per coordinated part plus discoveries, in one transaction; verified mentions are protected. Logs `[V2_SAVE]`.
- **Lexicon cache** (`services/ingredient/lexicon-cache.ts`): one resolver context per process, reused for 15 seconds, then rebuilt only if the revision changed (snapshot from Redis `lexicon:snapshot:<revision>`, else the database). A message on `lexicon:revision` marks it stale immediately. Logs `[LEXICON_CACHE]`.
- **Reinterpret queue** (`workers/reinterpret`, `services/reinterpret`): a run per revision (`reinterpret-<revision>`) selects the stale lines, starts batches of 200 (`reinterpret-<revision>-<n>`, 3 attempts with backoff, concurrency 2), and records progress in `ReinterpretRun`. Fresh lines are skipped, so retries and repeated runs are safe. Logs `[REINTERPRET]`.

### Grammar loop and maintenance (Phase 6)

```bash
# Re-read every stored mention with the working-tree parser and write packages/parser/fixtures/reports/reparse-<version>.md; writes nothing to the database
yarn workspace @peas/queue reparse:dry-run

# After a grammar change ships: start the REPARSE_BY_VERSION run ("reparse-<version>") for lines written by other parser versions
yarn workspace @peas/queue reparse
```

- **Routes:** `POST /reinterpret/reparse` (optional `parserVersion`, defaults to the running parser), `POST /reinterpret/sweep`, and `POST /reinterpret/snapshot`.
- **Jobs on the reinterpret queue:** `CORPUS_HEALTH_SNAPSHOT` (aggregate SQL only; one per finished run, keyed by the run id) and `EXPLORATORY_SWEEP` (discoveries only, never mentions). `scheduleMaintenanceJobs` registers a daily snapshot (`0 3 * * *`) and a weekly sweep (`0 4 * * 0`) on start. Logs `[HEALTH_SNAPSHOT]`, `[EXPLORATORY_SWEEP]`, `[MAINTENANCE]`.
- Background batches add the mentions they change to the decision that produced the revision (`LexiconDecision.mentionsChanged`), so the health page's "taught to fixed" counts them.

### Clearing imports

```bash
# Stop yarn dev first. Deletes imported notes, lines, mentions, recipes, sources, queued jobs, Redis work, and local uploads; keeps users and food knowledge
yarn workspace @peas/queue clear-imports --yes

# Also deletes food knowledge (concepts, lexicon, attributes, preparations, decisions, review cards, products, brands, ingredient tags, legacy mappings, health snapshots) and cached lexicon snapshots; reseed afterwards
yarn workspace @peas/queue clear-imports --yes --include-ontology
yarn workspace @peas/database db:seed:ontology && yarn workspace @peas/database db:seed:modifiers && yarn workspace @peas/database db:seed:foods
```

Without `--yes` the script only prints what it would delete. R2 isn't touched; the dashboard's Delete All Data (admins) cleans R2 too and always keeps food knowledge.

### API Endpoints

#### File Import

```bash
# Import HTML files
POST /import
Content-Type: multipart/form-data

# Get import status
GET /import/status/:importId
```

#### Note Management

```bash
# Get note by ID
GET /notes/:noteId

# Get note status
GET /notes/:noteId/status
```

#### Health Monitoring

```bash
# Basic health check
GET /health

# Detailed health check
GET /health/ready

# Component health check
GET /health/component/:component
```

#### Reinterpretation and lexicon revisions

```bash
# Start (or return) the background run for a revision: 202 { jobId: "reinterpret-15", status }
POST /reinterpret { "revision": 15, "phrases": ["icing sugar"], "conceptIds": [] }

# Progress of a revision's run
GET /reinterpret/:revision/status

# Tell every queue process to reload its resolver context now
POST /reinterpret/lexicon-revision { "revision": 15 }
```

#### Ingredient metrics

```bash
# Last hour of parses in this process (lines per second, structural success, resolution coverage, candidates per part, unknown words) plus corpus counts (mentions by status, open discoveries, reinterpretation backlog)
GET /metrics/ingredients
```

#### Performance Monitoring

```bash
# Performance overview
GET /performance/overview

# Performance metrics
GET /performance/metrics

# Memory usage
GET /performance/memory

# Database optimization
GET /performance/database

# Performance health
GET /performance/health
```

#### Cache Management

```bash
# Get cache stats
GET /cache/stats

# Clear all caches
POST /cache/clear

# Invalidate specific cache
POST /cache/invalidate
```

### WebSocket API

```javascript
// Connect to WebSocket
const ws = new WebSocket("ws://localhost:8080");

// Listen for status updates
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log("Status update:", message);
};

// Send ping to keep connection alive
setInterval(() => {
  ws.send(JSON.stringify({ type: "ping" }));
}, 30000);
```

## 🔧 Development

### Code Style

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with custom rules
- **Prettier**: Code formatting
- **Conventional Commits**: Git commit message format

### Testing

```bash
# Run all tests
yarn test

# Run tests with coverage
yarn test:coverage

# Run specific test file
yarn test:file src/workers/note/worker.test.ts
```

### Building

```bash
# Build for production
yarn build

# Build with type checking
yarn build:check

# Build and watch for changes
yarn build:watch
```

### Database Management

```bash
# Run migrations
yarn db:migrate

# Generate migration
yarn db:migrate:generate

# Reset database
yarn db:reset

# Seed database
yarn db:seed
```

## 📊 Monitoring & Observability

### Performance Metrics

- **Operation Timing**: Detailed timing for all operations
- **Memory Usage**: Heap, external, and array buffer monitoring
- **CPU Usage**: Process and system CPU monitoring
- **Database Performance**: Query timing and cache hit rates
- **Queue Performance**: Job processing times and throughput

### Health Checks

- **Database Connectivity**: Connection pool health
- **Redis Connectivity**: Cache service health
- **Queue Health**: Worker and job queue status
- **Memory Health**: Memory usage and leak detection
- **System Resources**: CPU, memory, and disk usage

### Logging

- **Structured Logging**: JSON-formatted logs with context
- **Log Levels**: Debug, Info, Warn, Error, Fatal
- **Context Awareness**: Job, worker, and component context
- **File Rotation**: Automatic log file rotation
- **Performance Logging**: Operation timing and resource usage

## 🔒 Security

### Security Features

- **Security Headers**: Comprehensive security headers
- **CORS Protection**: Configurable CORS policies
- **Rate Limiting**: Request rate limiting
- **Input Validation**: Request body and parameter validation
- **Error Sanitization**: Safe error message handling

### Best Practices

- **Environment Variables**: Secure configuration management
- **Input Sanitization**: All inputs validated and sanitized
- **Error Handling**: Secure error handling without information leakage
- **Resource Limits**: Request size and rate limiting
- **Authentication**: JWT-based authentication support

## 🚀 Performance Optimization

### Optimization Features

- **Query Caching**: Database query result caching
- **Memory Pooling**: Object pooling for memory efficiency
- **Batch Operations**: Bulk database operations
- **Connection Pooling**: Database connection optimization
- **Garbage Collection**: Automatic memory cleanup

### Monitoring Tools

- **Performance Profiling**: Automatic operation profiling
- **Memory Leak Detection**: Automatic memory leak detection
- **Database Optimization**: Query optimization recommendations
- **Cache Optimization**: Cache hit rate monitoring
- **Resource Monitoring**: CPU, memory, and disk monitoring

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards

- Follow TypeScript best practices
- Write comprehensive tests
- Use conventional commit messages
- Update documentation for new features
- Follow the established code style

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the documentation
- Review the health endpoints for system status
- Monitor the performance endpoints for optimization opportunities

## 🔄 Changelog

### Recent Updates

- **Performance Optimization**: Comprehensive performance monitoring and optimization systems
- **Standardization**: Standardized logging, error handling, and configuration
- **Security Enhancement**: Global and route-specific security middleware
- **Type System**: Consolidated duplicate types and interfaces
- **Code Cleanup**: Removed unused files and dead code

For a complete changelog, see the [CHANGELOG.md](CHANGELOG.md) file.
