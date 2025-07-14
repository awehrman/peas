# Queue Service

A robust queue processing service built with BullMQ for handling recipe import and processing tasks.

## Features

### 🚀 Enhanced Error Handling

- **Structured Error Types**: Categorized errors (validation, database, redis, network, etc.)
- **Error Severity Levels**: LOW, MEDIUM, HIGH, CRITICAL for proper prioritization
- **Smart Retry Logic**: Configurable retry strategies with exponential backoff
- **Error Classification**: Automatic error type detection and classification
- **Comprehensive Logging**: Structured error logging with context and metadata

### 🏥 Health Monitoring

- **Service Health Checks**: Database, Redis, and queue connectivity monitoring
- **Circuit Breaker Patterns**: Protection against cascading failures
- **Health Endpoints**: `/health` endpoint for monitoring and alerting
- **Performance Metrics**: Response time tracking and degradation detection

### 🛡️ Input Validation

- **Job Data Validation**: Type-safe validation of all job inputs
- **File Validation**: Import file existence, readability, and content validation
- **Graceful Degradation**: Continue processing when non-critical components fail

### 🔄 Retry & Recovery

- **Exponential Backoff**: Smart retry delays to prevent overwhelming services
- **Retry Limits**: Configurable maximum retry attempts per job type
- **Permanent Failure Handling**: Jobs marked as permanently failed after retry exhaustion
- **Partial Success Handling**: Continue processing when sub-tasks fail

### 📊 Monitoring & Observability

- **Request Logging**: All HTTP requests logged with timing and status
- **Job Lifecycle Tracking**: Complete job processing lifecycle monitoring
- **Error Context**: Rich error context for debugging and monitoring
- **Performance Metrics**: Response times and throughput tracking

## Architecture

### Error Handling Flow

```
Job Input → Validation → Health Check → Processing → Error Handling → Retry/Complete
```

### Error Types

- `VALIDATION_ERROR`: Input validation failures
- `DATABASE_ERROR`: Database connection or query failures
- `REDIS_ERROR`: Redis connection or operation failures
- `PARSING_ERROR`: HTML parsing or data extraction failures
- `EXTERNAL_SERVICE_ERROR`: Third-party service failures
- `NETWORK_ERROR`: Network connectivity issues
- `TIMEOUT_ERROR`: Operation timeout failures
- `UNKNOWN_ERROR`: Unclassified errors

### Health Check Components

- **Database**: Connection and query performance
- **Redis**: Connection and basic operations
- **Queues**: Queue system availability
- **Overall Status**: Aggregated health status

## API Endpoints

### Health Check

```http
GET /health
```

Returns comprehensive service health status.

### Import

```http
POST /import
```

Start import process for HTML files.

```http
GET /import/status
```

Get current import job status.

### Bull Board

```http
GET /bull-board
```

Queue monitoring dashboard.

## Configuration

### Environment Variables

- `PORT`: Server port (default: 4200)
- `DATABASE_URL`: Database connection string
- `REDISHOST`: Redis host
- `REDISPORT`: Redis port (default: 6379)
- `REDISUSER`: Redis username
- `REDISPASSWORD`: Redis password

### Retry Configuration

```typescript
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  backoffMs: 1000,
  backoffMultiplier: 2,
  maxBackoffMs: 30000,
};
```

## Error Handling Examples

### Validation Error

```typescript
const validationError = ErrorHandler.createValidationError(
  "Missing required field: content",
  "content",
  undefined
);
```

### Database Error

```typescript
const dbError = ErrorHandler.createDatabaseError(error, "create_note", "notes");
```

### Retry Logic

```typescript
if (ErrorHandler.shouldRetry(jobError, retryCount)) {
  const backoffDelay = ErrorHandler.calculateBackoff(retryCount);
  // Schedule retry
}
```

## Monitoring

### Health Status Response

```json
{
  "status": "healthy",
  "checks": {
    "database": {
      "status": "healthy",
      "message": "Database is responding normally",
      "responseTime": 45,
      "lastChecked": "2024-01-01T00:00:00.000Z"
    },
    "redis": {
      "status": "healthy",
      "message": "Redis configuration is valid",
      "responseTime": 12,
      "lastChecked": "2024-01-01T00:00:00.000Z"
    },
    "queues": {
      "noteQueue": {
        "status": "healthy",
        "message": "Queue system is operational",
        "responseTime": 8,
        "lastChecked": "2024-01-01T00:00:00.000Z"
      }
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Log Format

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "type": "DATABASE_ERROR",
  "severity": "HIGH",
  "message": "Database connection failed",
  "jobId": "job-123",
  "queueName": "noteQueue",
  "retryCount": 1,
  "context": {
    "operation": "create_note",
    "noteId": "note-456"
  }
}
```

## Development

### Running Locally

```bash
yarn dev
```

### Building

```bash
yarn build
```

### Testing

```bash
yarn test
```

## Graceful Shutdown

The service implements graceful shutdown handling:

- Closes all queue connections
- Completes in-flight jobs
- Shuts down HTTP server
- Handles uncaught exceptions and unhandled rejections

## Best Practices

1. **Always validate inputs** before processing
2. **Use structured errors** for better debugging
3. **Implement retry logic** for transient failures
4. **Monitor health status** regularly
5. **Log errors with context** for debugging
6. **Handle partial failures** gracefully
7. **Use appropriate error severity** levels
8. **Implement circuit breakers** for external services

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Check Redis server status
   - Verify connection credentials
   - Check network connectivity

2. **Database Connection Failed**
   - Verify DATABASE_URL
   - Check database server status
   - Verify connection pool settings

3. **Job Processing Failed**
   - Check job data validation
   - Review error logs for specific failure reasons
   - Verify external service dependencies

4. **Import Process Failed**
   - Check file directory permissions
   - Verify HTML file format
   - Review import logs for specific file errors
