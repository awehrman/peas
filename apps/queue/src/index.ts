// Load environment variables first, before any other imports
import "./load-env";

// Now import everything else
import express from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { ExpressAdapter } from "@bull-board/express";
import { importRouter, notesRouter, healthRouter } from "./routes";
import { ErrorType, ErrorSeverity } from "./types";
import { initializeWebSocketServer } from "./websocket-server";
import { serviceContainer } from "./services";

import cors from "cors";

const app = express();

// Enhanced error handling middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;

    if (status >= 400) {
      console.warn(`⚠️ ${req.method} ${req.path} - ${status} (${duration}ms)`);
    } else {
      console.log(`✅ ${req.method} ${req.path} - ${status} (${duration}ms)`);
    }
  });

  next();
});

app.use(cors());
app.use(express.json({ limit: "10mb" })); // Limit request size

// Global error handler
app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    const jobError =
      serviceContainer.errorHandler.errorHandler.classifyError(error);
    jobError.context = {
      ...jobError.context,
      path: req.path,
      method: req.method,
      userAgent: req.get("User-Agent"),
    };

    serviceContainer.errorHandler.errorHandler.logError(jobError);

    res.status(500).json({
      error: {
        message: jobError.message,
        type: jobError.type,
        code: jobError.code,
      },
      timestamp: jobError.timestamp.toISOString(),
    });
  }
);

// Bull-Board setup with error handling
const serverAdapter = new ExpressAdapter();
try {
  createBullBoard({
    queues: [
      new BullMQAdapter(serviceContainer.queues.noteQueue),
      new BullMQAdapter(serviceContainer.queues.imageQueue),
      new BullMQAdapter(serviceContainer.queues.ingredientQueue),
      new BullMQAdapter(serviceContainer.queues.instructionQueue),
      new BullMQAdapter(serviceContainer.queues.categorizationQueue),
    ],
    serverAdapter,
  });

  serverAdapter.setBasePath("/bull-board");
  app.use("/bull-board", serverAdapter.getRouter());
} catch (error) {
  const jobError = serviceContainer.errorHandler.errorHandler.createJobError(
    error as Error,
    ErrorType.EXTERNAL_SERVICE_ERROR,
    ErrorSeverity.HIGH,
    { operation: "bull_board_setup" }
  );
  serviceContainer.errorHandler.errorHandler.logError(jobError);
  console.error("Failed to setup Bull Board, continuing without it");
}

// Health check endpoint with monitoring
app.get("/health", async (req, res) => {
  try {
    const health =
      await serviceContainer.healthMonitor.healthMonitor.getHealth();

    const statusCode =
      health.status === "healthy"
        ? 200
        : health.status === "degraded"
          ? 200
          : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    const jobError = serviceContainer.errorHandler.errorHandler.createJobError(
      error as Error,
      ErrorType.EXTERNAL_SERVICE_ERROR,
      ErrorSeverity.HIGH,
      { operation: "health_check_endpoint" }
    );
    serviceContainer.errorHandler.errorHandler.logError(jobError);

    res.status(503).json({
      status: "unhealthy",
      message: "Health check failed",
      error: jobError.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Routes
app.use("/import", importRouter);
app.use("/notes", notesRouter);
app.use("/health", healthRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);

  try {
    // Close all queues gracefully
    await Promise.allSettled([
      serviceContainer.queues.noteQueue.close(),
      serviceContainer.queues.imageQueue.close(),
      serviceContainer.queues.ingredientQueue.close(),
      serviceContainer.queues.instructionQueue.close(),
      serviceContainer.queues.categorizationQueue.close(),
    ]);

    console.log("✅ All queues closed successfully");

    // Close server
    server.close(() => {
      console.log("✅ HTTP server closed");
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.error("❌ Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  } catch (error) {
    const jobError = serviceContainer.errorHandler.errorHandler.createJobError(
      error as Error,
      ErrorType.UNKNOWN_ERROR,
      ErrorSeverity.CRITICAL,
      { operation: "graceful_shutdown" }
    );
    serviceContainer.errorHandler.errorHandler.logError(jobError);
    process.exit(1);
  }
};

// Start server with error handling
const server = app.listen(serviceContainer.config.port, () => {
  console.log(
    `🚀 Queue service running at http://localhost:${serviceContainer.config.port}`
  );
  console.log(
    `📊 Bull Board available at http://localhost:${serviceContainer.config.port}/bull-board`
  );
  console.log(
    `❤️ Health check available at http://localhost:${serviceContainer.config.port}/health`
  );

  // Initialize WebSocket server
  const wsManager = initializeWebSocketServer(serviceContainer.config.wsPort);
  serviceContainer.webSocket.webSocketManager = wsManager;
  console.log(
    `🔌 WebSocket server running on port ${serviceContainer.config.wsPort}`
  );

  // Workers are automatically started when queues are imported
  console.log("👷 All workers started successfully");
});

// Handle server errors
server.on("error", (error) => {
  const jobError = serviceContainer.errorHandler.errorHandler.createJobError(
    error,
    ErrorType.NETWORK_ERROR,
    ErrorSeverity.CRITICAL,
    { operation: "server_startup" }
  );
  serviceContainer.errorHandler.errorHandler.logError(jobError);
  process.exit(1);
});

// Register shutdown handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  const jobError = serviceContainer.errorHandler.errorHandler.createJobError(
    error,
    ErrorType.UNKNOWN_ERROR,
    ErrorSeverity.CRITICAL,
    { operation: "uncaught_exception" }
  );
  serviceContainer.errorHandler.errorHandler.logError(jobError);
  gracefulShutdown("uncaught exception");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  const jobError = serviceContainer.errorHandler.errorHandler.createJobError(
    reason as Error,
    ErrorType.UNKNOWN_ERROR,
    ErrorSeverity.CRITICAL,
    { operation: "unhandled_rejection", promise: promise.toString() }
  );
  serviceContainer.errorHandler.errorHandler.logError(jobError);
  gracefulShutdown("unhandled rejection");
});
