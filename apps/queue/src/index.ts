import { SERVER_DEFAULTS } from "./config";
import "./load-env";
import {
  cacheRouter,
  healthEnhancedRouter,
  importRouter,
  metricsRouter,
  notesRouter,
  testRouter,
} from "./routes";
import { ServiceContainer } from "./services";

import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { ExpressAdapter } from "@bull-board/express";
import cors from "cors";
import express from "express";

import { ManagerFactory } from "./config/factory";
// // import { SecurityMiddleware } from "./middleware/security";
import { startWorkers } from "./workers/startup";

// Type guard to check if value is an Error
function isError(value: unknown): value is Error {
  return value instanceof Error;
}

// Helper to create a proper error from unknown
function createError(value: unknown): Error {
  if (isError(value)) {
    return value;
  }
  if (typeof value === "string") {
    return new Error(value);
  }
  return new Error(String(value));
}

async function initializeApp() {
  const serviceContainer = await ServiceContainer.getInstance();

  // Initialize managers using factory
  const databaseManager = ManagerFactory.createDatabaseManager();
  const cacheManager = ManagerFactory.createCacheManager();
  const metricsCollector = ManagerFactory.createMetricsCollector();

  try {
    await databaseManager.checkConnectionHealth();
    await cacheManager.connect();

    // Start health monitoring
    databaseManager.startHealthMonitoring();

    // Start metrics collection
    metricsCollector.startCollection();

    console.log("✅ Database, cache, and metrics initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize database or cache:", error);
    // Continue startup even if cache fails
  }

  const app = express();

  // Enhanced error handling middleware
  app.use((req, res, next) => {
    const startTime = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - startTime;
      const status = res.statusCode;

      if (status >= 400) {
        serviceContainer.logger.log(
          `⚠️ ${req.method} ${req.path} - ${status} (${duration}ms)`,
          "warn"
        );
      } else {
        serviceContainer.logger.log(
          `✅ ${req.method} ${req.path} - ${status} (${duration}ms)`
        );
      }
    });

    next();
  });

  // TODO: Apply security middleware globally
  // app.use(SecurityMiddleware.addSecurityHeaders);
  // app.use(SecurityMiddleware.configureCORS(["http://localhost:3000"]));
  // app.use(SecurityMiddleware.validateRequestSize(10 * 1024 * 1024)); // 10MB limit
  // app.use(SecurityMiddleware.rateLimit(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

  app.use(cors());

  app.use(express.json({ limit: SERVER_DEFAULTS.REQUEST_SIZE_LIMIT }));

  app.use(
    (
      error: unknown,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      const properError = createError(error);
      const errorType =
        serviceContainer.errorHandler.classifyError(properError);
      serviceContainer.errorHandler.createJobError(properError, {
        operation: "express_error_middleware",
        path: req.path,
        method: req.method,
        userAgent: req.get("User-Agent"),
        timestamp: new Date(),
      });

      serviceContainer.errorHandler.logError(properError, {
        operation: "express_error_middleware",
        path: req.path,
        method: req.method,
        timestamp: new Date(),
      });

      res.status(500).json({
        error: {
          message: properError.message,
          type: errorType,
          code: "INTERNAL_ERROR",
        },
        timestamp: new Date().toISOString(),
      });
    }
  );

  // Bull-Board setup with error handling
  const serverAdapter = new ExpressAdapter();
  try {
    createBullBoard({
      queues: [
        new BullMQAdapter(serviceContainer.queues.noteQueue),
        // TODO: Add back other queues as needed
        // new BullMQAdapter(serviceContainer.queues.imageQueue),
        // new BullMQAdapter(serviceContainer.queues.ingredientQueue),
        // new BullMQAdapter(serviceContainer.queues.instructionQueue),
        // new BullMQAdapter(serviceContainer.queues.categorizationQueue),
        // new BullMQAdapter(serviceContainer.queues.sourceQueue),
      ],
      serverAdapter,
    });

    serverAdapter.setBasePath("/bull-board");
    app.use("/bull-board", serverAdapter.getRouter());
  } catch (error) {
    const properError = createError(error);
    serviceContainer.errorHandler.createJobError(properError, {
      operation: "bull_board_setup",
      timestamp: new Date(),
    });
    serviceContainer.errorHandler.logError(properError, {
      operation: "bull_board_setup",
      timestamp: new Date(),
    });
    serviceContainer.logger.log(
      "Failed to setup Bull Board, continuing without it",
      "error"
    );
  }

  return { app, serviceContainer };
}

// Start the application
initializeApp()
  .then(({ app, serviceContainer }) => {
    // Routes
    app.use("/import", importRouter);
    app.use("/notes", notesRouter);
    app.use("/health", healthEnhancedRouter); // Enhanced health endpoints
    app.use("/test", testRouter);
    app.use("/metrics", metricsRouter);
    app.use("/cache", cacheRouter); // Cache management endpoints

    // 404 handler
    app.use("*", (req, res) => {
      res.status(404).json({
        error: "Not Found",
        message: `Route ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
      });
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      serviceContainer.logger.log(
        `🛑 Received ${signal}. Starting graceful shutdown...`,
        "info"
      );

      try {
        // Get managers from factory for shutdown
        const dbManager = ManagerFactory.createDatabaseManager();
        const cacheMgr = ManagerFactory.createCacheManager();
        const metricsMgr = ManagerFactory.createMetricsCollector();

        // Stop database and cache managers
        await dbManager.shutdown();
        await cacheMgr.disconnect();

        // Stop metrics collection
        metricsMgr.stopCollection();

        await serviceContainer.close();
        serviceContainer.logger.log(
          "✅ Graceful shutdown completed successfully",
          "info"
        );
        // eslint-disable-next-line no-process-exit
        process.exit(0);
      } catch (error) {
        const properError = createError(error);
        serviceContainer.errorHandler.createJobError(properError, {
          operation: "graceful_shutdown",
          timestamp: new Date(),
        });
        serviceContainer.errorHandler.logError(properError, {
          operation: "graceful_shutdown",
          timestamp: new Date(),
        });
        // eslint-disable-next-line no-process-exit
        process.exit(1); // Exit with error code instead of throwing
      }
    };

    // Start the server
    const server = app.listen(serviceContainer.config.port, () => {
      serviceContainer.logger.log(
        `🚀 Server running on port ${serviceContainer.config.port}`,
        "info"
      );
      serviceContainer.logger.log(
        `📊 Health check available at http://localhost:${serviceContainer.config.port}/health`,
        "info"
      );
      serviceContainer.logger.log(
        `🔧 Bull Board available at http://localhost:${serviceContainer.config.port}/bull-board`,
        "info"
      );
      serviceContainer.logger.log(
        `📡 WebSocket server starting on port ${serviceContainer.config.wsPort}`,
        "info"
      );
    });

    // Initialize WebSocket server using factory
    ManagerFactory.createWebSocketManager(serviceContainer.config.wsPort);

    // Start workers
    startWorkers(serviceContainer.queues, serviceContainer);

    // Handle server errors
    server.on("error", (error) => {
      const properError = createError(error);
      serviceContainer.errorHandler.createJobError(properError, {
        operation: "server_startup",
        timestamp: new Date(),
      });
      serviceContainer.errorHandler.logError(properError, {
        operation: "server_startup",
        timestamp: new Date(),
      });
      // eslint-disable-next-line no-process-exit
      process.exit(1); // Exit with error code instead of throwing
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      const properError = createError(error);
      serviceContainer.errorHandler.createJobError(properError, {
        operation: "uncaught_exception",
        timestamp: new Date(),
      });
      serviceContainer.errorHandler.logError(properError, {
        operation: "uncaught_exception",
        timestamp: new Date(),
      });
      gracefulShutdown("uncaught exception");
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      const properError = createError(reason);
      serviceContainer.errorHandler.createJobError(properError, {
        operation: "unhandled_rejection",
        promise: promise.toString(),
        timestamp: new Date(),
      });
      serviceContainer.errorHandler.logError(properError, {
        operation: "unhandled_rejection",
        promise: promise.toString(),
        timestamp: new Date(),
      });
      gracefulShutdown("unhandled rejection");
    });

    // Handle graceful shutdown signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  })
  .catch((error) => {
    console.error("Failed to initialize application:", error);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  });
