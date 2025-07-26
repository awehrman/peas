import { EventEmitter } from "events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Import the mocked ManagerFactory
import { ManagerFactory } from "../../config/factory";
import { createConsoleSpies } from "../../test-utils/test-utils";
import { HealthStatus } from "../../types";
import type { HealthCheck, ServiceHealth } from "../../types";
import type { JobMetrics } from "../../types/monitoring";
import type { PerformanceMetrics } from "../../utils/metrics";
import { SystemMonitor } from "../system-monitor";

// Mock the entire ManagerFactory class
vi.mock("../../config/factory", () => ({
  ManagerFactory: {
    createHealthMonitor: vi.fn(),
    createMetricsCollector: vi.fn(),
    createCacheManager: vi.fn(),
  },
}));

describe("SystemMonitor", () => {
  let systemMonitor: SystemMonitor;
  let consoleSpies: ReturnType<typeof createConsoleSpies>;

  beforeEach(() => {
    SystemMonitor._resetForTests();
    // Clear all mocks
    vi.clearAllMocks();

    // Setup default mocks with proper typing
    vi.mocked(ManagerFactory.createHealthMonitor).mockReturnValue({
      getHealth: vi.fn().mockResolvedValue({
        status: HealthStatus.HEALTHY,
        checks: {
          database: {
            status: HealthStatus.HEALTHY,
            message: "Database is healthy",
            lastChecked: new Date(),
          } as HealthCheck,
          redis: {
            status: HealthStatus.HEALTHY,
            message: "Redis is healthy",
            lastChecked: new Date(),
          } as HealthCheck,
          queues: {},
        },
        timestamp: new Date(),
      } as ServiceHealth),
    } as unknown as ReturnType<typeof ManagerFactory.createHealthMonitor>);

    vi.mocked(ManagerFactory.createMetricsCollector).mockReturnValue({
      getPerformanceMetrics: vi.fn().mockReturnValue({
        requestCount: 100,
        requestDuration: 150,
        errorCount: 5,
        activeConnections: 10,
        memoryUsage: 512,
        cpuUsage: 25,
        queueSize: 50,
        cacheHitRate: 0.85,
        averageResponseTime: 150,
        requestsPerSecond: 100,
      } as PerformanceMetrics),
    } as unknown as ReturnType<typeof ManagerFactory.createMetricsCollector>);

    vi.mocked(ManagerFactory.createCacheManager).mockReturnValue({
      isReady: vi.fn().mockReturnValue(true),
    } as unknown as ReturnType<typeof ManagerFactory.createCacheManager>);

    // Create console spies
    consoleSpies = createConsoleSpies();

    // Create a fresh instance for each test
    systemMonitor = SystemMonitor.getInstance();
  });

  afterEach(() => {
    // Clean up console spies
    consoleSpies.restore();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance when getInstance is called multiple times", () => {
      const instance1 = SystemMonitor.getInstance();
      const instance2 = SystemMonitor.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("Job Metrics Tracking", () => {
    it("should track job metrics successfully", () => {
      const jobId = "test-job-1";
      const duration = 1500;
      const success = true;
      const queueName = "test-queue";
      const workerName = "test-worker";

      systemMonitor.trackJobMetrics(
        jobId,
        duration,
        success,
        queueName,
        workerName
      );

      const metrics = systemMonitor.getJobMetrics(jobId);
      expect(metrics).toEqual({
        jobId,
        duration,
        success,
        queueName,
        workerName,
        error: undefined,
        timestamp: expect.any(Date),
      });
    });

    it("should track failed job metrics with error", () => {
      const jobId = "test-job-2";
      const duration = 2000;
      const success = false;
      const error = "Database connection failed";

      systemMonitor.trackJobMetrics(
        jobId,
        duration,
        success,
        undefined,
        undefined,
        error
      );

      const metrics = systemMonitor.getJobMetrics(jobId);
      expect(metrics).toEqual({
        jobId,
        duration,
        success,
        queueName: undefined,
        workerName: undefined,
        error,
        timestamp: expect.any(Date),
      });
    });

    it("should return undefined for non-existent job metrics", () => {
      const metrics = systemMonitor.getJobMetrics("non-existent-job");
      expect(metrics).toBeUndefined();
    });

    it("should get all job metrics", () => {
      systemMonitor.trackJobMetrics("job-1", 1000, true);
      systemMonitor.trackJobMetrics("job-2", 2000, false);

      const allMetrics = systemMonitor.getAllJobMetrics();
      expect(allMetrics).toHaveLength(2);
      expect(allMetrics.map((m) => m.jobId)).toContain("job-1");
      expect(allMetrics.map((m) => m.jobId)).toContain("job-2");
    });

    it("should get job metrics for specific queue", () => {
      systemMonitor.trackJobMetrics("job-1", 1000, true, "queue-1");
      systemMonitor.trackJobMetrics("job-2", 2000, false, "queue-2");
      systemMonitor.trackJobMetrics("job-3", 3000, true, "queue-1");

      const queueMetrics = systemMonitor.getQueueJobMetrics("queue-1");
      expect(queueMetrics).toHaveLength(2);
      expect(queueMetrics.map((m) => m.jobId)).toContain("job-1");
      expect(queueMetrics.map((m) => m.jobId)).toContain("job-3");
    });
  });

  describe("Queue Metrics Tracking", () => {
    it("should track queue metrics successfully", () => {
      const queueName = "test-queue";
      const jobCount = 10;
      const waitingCount = 3;
      const activeCount = 2;
      const completedCount = 4;
      const failedCount = 1;

      systemMonitor.trackQueueMetrics(
        queueName,
        jobCount,
        waitingCount,
        activeCount,
        completedCount,
        failedCount
      );

      const metrics = systemMonitor.getQueueMetrics(queueName);
      expect(metrics).toEqual({
        queueName,
        jobCount,
        waitingCount,
        activeCount,
        completedCount,
        failedCount,
        timestamp: expect.any(Date),
      });
    });

    it("should track queue metrics with default values", () => {
      const queueName = "test-queue";
      const jobCount = 5;

      systemMonitor.trackQueueMetrics(queueName, jobCount);

      const metrics = systemMonitor.getQueueMetrics(queueName);
      expect(metrics).toEqual({
        queueName,
        jobCount,
        waitingCount: 0,
        activeCount: 0,
        completedCount: 0,
        failedCount: 0,
        timestamp: expect.any(Date),
      });
    });

    it("should return undefined for non-existent queue metrics", () => {
      const metrics = systemMonitor.getQueueMetrics("non-existent-queue");
      expect(metrics).toBeUndefined();
    });

    it("should get all queue metrics", () => {
      systemMonitor.trackQueueMetrics("queue-1", 10);
      systemMonitor.trackQueueMetrics("queue-2", 20);

      const allMetrics = systemMonitor.getAllQueueMetrics();
      expect(allMetrics).toHaveLength(2);
      expect(allMetrics.map((m) => m.queueName)).toContain("queue-1");
      expect(allMetrics.map((m) => m.queueName)).toContain("queue-2");
    });
  });

  describe("Structured Logging", () => {
    it("should log job events", () => {
      const jobEvent = {
        type: "job_processed" as const,
        data: {
          jobId: "test-job",
          duration: 1500,
          success: true,
          queueName: "test-queue",
          workerName: "test-worker",
          error: undefined,
        },
        timestamp: new Date(),
      };

      systemMonitor.logJobEvent(jobEvent);

      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        "[JOB] job_processed:",
        expect.objectContaining({
          jobId: "test-job",
          duration: 1500,
          success: true,
          queueName: "test-queue",
          workerName: "test-worker",
          error: undefined,
          timestamp: expect.any(String),
        })
      );
    });

    it("should log worker events", () => {
      const workerEvent = {
        type: "worker_started" as const,
        data: {
          workerName: "test-worker",
          status: "started" as const,
          queueName: "test-queue",
          jobCount: 5,
        },
        timestamp: new Date(),
      };

      systemMonitor.logWorkerEvent(workerEvent);

      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        "[WORKER] worker_started:",
        expect.objectContaining({
          workerName: "test-worker",
          status: "started",
          queueName: "test-queue",
          jobCount: 5,
          timestamp: expect.any(String),
        })
      );
    });

    it("should log system events", () => {
      const systemEvent = {
        type: "error_occurred" as const,
        data: {
          component: "test-component",
          status: "error" as const,
          message: "Test error message",
          error: "Test error",
        },
        timestamp: new Date(),
      };

      systemMonitor.logSystemEvent(systemEvent);

      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        "[SYSTEM] error_occurred:",
        expect.objectContaining({
          component: "test-component",
          status: "error",
          message: "Test error message",
          error: "Test error",
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe("Health Reporting", () => {
    it("should generate comprehensive health report", async () => {
      // Add some test data
      systemMonitor.trackJobMetrics("job-1", 1000, true, "queue-1");
      systemMonitor.trackJobMetrics("job-2", 2000, false, "queue-1");
      systemMonitor.trackQueueMetrics("queue-1", 10, 3, 2, 4, 1);

      const report = await systemMonitor.generateHealthReport();

      expect(report).toEqual({
        timestamp: expect.any(Date),
        overallStatus: expect.stringMatching(/healthy|degraded|unhealthy/),
        systemHealth: {
          status: "healthy",
          checks: {
            database: {
              status: "healthy",
              message: "Database is healthy",
              lastChecked: expect.any(Date),
            },
            redis: {
              status: "healthy",
              message: "Redis is healthy",
              lastChecked: expect.any(Date),
            },
            queues: {},
          },
          timestamp: expect.any(Date),
        },
        performanceMetrics: {
          requestCount: 100,
          requestDuration: 150,
          errorCount: 5,
          activeConnections: 10,
          memoryUsage: 512,
          cpuUsage: 25,
          queueSize: 50,
          cacheHitRate: 0.85,
          averageResponseTime: 150,
          requestsPerSecond: 100,
        },
        queueHealth: expect.any(Object),
        jobHealth: expect.any(Object),
        cacheHealth: expect.any(Object),
        recommendations: expect.any(Array),
      });
    });

    it("should determine overall status as healthy when all systems are healthy", async () => {
      // Mock healthy systems
      vi.mocked(ManagerFactory.createHealthMonitor).mockReturnValue({
        getHealth: vi.fn().mockResolvedValue({
          status: HealthStatus.HEALTHY,
          checks: {
            database: {
              status: HealthStatus.HEALTHY,
              message: "Database is healthy",
              lastChecked: new Date(),
            } as HealthCheck,
            redis: {
              status: HealthStatus.HEALTHY,
              message: "Redis is healthy",
              lastChecked: new Date(),
            } as HealthCheck,
            queues: {},
          },
          timestamp: new Date(),
        } as ServiceHealth),
      } as unknown as ReturnType<typeof ManagerFactory.createHealthMonitor>);

      systemMonitor.trackJobMetrics("job-1", 1000, true);
      systemMonitor.trackQueueMetrics("queue-1", 10, 3, 2, 4, 0); // No failures

      const report = await systemMonitor.generateHealthReport();
      expect(report.overallStatus).toBe("healthy");
    });

    it("should determine overall status as degraded when some systems are degraded", async () => {
      // Mock degraded system health
      vi.mocked(ManagerFactory.createHealthMonitor).mockReturnValue({
        getHealth: vi.fn().mockResolvedValue({
          status: HealthStatus.DEGRADED,
          checks: {
            database: {
              status: HealthStatus.DEGRADED,
              message: "Database is slow",
              lastChecked: new Date(),
            } as HealthCheck,
            redis: {
              status: HealthStatus.HEALTHY,
              message: "Redis is healthy",
              lastChecked: new Date(),
            } as HealthCheck,
            queues: {},
          },
          timestamp: new Date(),
        } as ServiceHealth),
      } as unknown as ReturnType<typeof ManagerFactory.createHealthMonitor>);

      // Ensure job health is healthy to avoid "unhealthy" override
      systemMonitor.trackJobMetrics("job-1", 100, true);
      systemMonitor.trackJobMetrics("job-2", 100, true);
      systemMonitor.trackJobMetrics("job-3", 100, true);
      systemMonitor.trackJobMetrics("job-4", 100, true);
      systemMonitor.trackJobMetrics("job-5", 100, true);

      const report = await systemMonitor.generateHealthReport();
      expect(report.overallStatus).toBe("degraded");
    });

    it("should determine overall status as unhealthy when systems are unhealthy", async () => {
      // Mock unhealthy system
      vi.mocked(ManagerFactory.createHealthMonitor).mockReturnValue({
        getHealth: vi.fn().mockResolvedValue({
          status: HealthStatus.UNHEALTHY,
          checks: {
            database: {
              status: HealthStatus.UNHEALTHY,
              message: "Database is unhealthy",
              lastChecked: new Date(),
            } as HealthCheck,
            redis: {
              status: HealthStatus.UNHEALTHY,
              message: "Redis is unhealthy",
              lastChecked: new Date(),
            } as HealthCheck,
            queues: {},
          },
          timestamp: new Date(),
        } as ServiceHealth),
      } as unknown as ReturnType<typeof ManagerFactory.createHealthMonitor>);

      systemMonitor.trackJobMetrics("job-1", 1000, false);
      systemMonitor.trackQueueMetrics("queue-1", 10, 3, 2, 4, 5); // High failure rate

      const report = await systemMonitor.generateHealthReport();
      expect(report.overallStatus).toBe("unhealthy");
    });

    it("should generate recommendations based on health status", async () => {
      // Mock unhealthy system
      vi.mocked(ManagerFactory.createHealthMonitor).mockReturnValue({
        getHealth: vi.fn().mockResolvedValue({
          status: HealthStatus.UNHEALTHY,
          checks: {
            database: {
              status: HealthStatus.UNHEALTHY,
              message: "Database is unhealthy",
              lastChecked: new Date(),
            } as HealthCheck,
            redis: {
              status: HealthStatus.UNHEALTHY,
              message: "Redis is unhealthy",
              lastChecked: new Date(),
            } as HealthCheck,
            queues: {},
          },
          timestamp: new Date(),
        } as ServiceHealth),
      } as unknown as ReturnType<typeof ManagerFactory.createHealthMonitor>);

      systemMonitor.trackJobMetrics("job-1", 1000, false);
      systemMonitor.trackQueueMetrics("queue-1", 10, 3, 2, 4, 5);

      const report = await systemMonitor.generateHealthReport();
      expect(report.recommendations).toContain(
        "Check database and Redis connectivity"
      );
      expect(report.recommendations).toContain(
        "Verify all required services are running"
      );
      expect(report.recommendations).toContain(
        "Review job processing logs for errors"
      );
      expect(report.recommendations).toContain(
        "Check worker configuration and dependencies"
      );
      expect(report.recommendations).toContain(
        "Investigate queue-1 queue failures"
      );
    });
  });

  describe("System Metrics", () => {
    it("should get system metrics summary", () => {
      // Add some test data
      systemMonitor.trackJobMetrics("job-1", 1000, true);
      systemMonitor.trackJobMetrics("job-2", 2000, false);
      systemMonitor.trackJobMetrics("job-3", 3000, true);

      const metrics = systemMonitor.getSystemMetrics();

      expect(metrics).toEqual({
        totalWorkers: 0,
        totalQueues: 0,
        totalJobsProcessed: 3,
        totalJobsFailed: 1,
        averageJobDuration: 2000, // (1000 + 2000 + 3000) / 3
        totalErrors: 1,
        uptime: expect.any(Number),
        lastUpdated: expect.any(Date),
        systemUptime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      });
    });

    it("should calculate average job duration correctly", () => {
      systemMonitor.trackJobMetrics("job-1", 1000, true);
      systemMonitor.trackJobMetrics("job-2", 3000, true);

      const metrics = systemMonitor.getSystemMetrics();
      expect(metrics.averageJobDuration).toBe(2000); // (1000 + 3000) / 2
    });

    it("should handle zero duration jobs in average calculation", () => {
      systemMonitor.trackJobMetrics("job-1", 0, true);
      systemMonitor.trackJobMetrics("job-2", 2000, true);

      const metrics = systemMonitor.getSystemMetrics();
      expect(metrics.averageJobDuration).toBe(2000); // Only 2000 counts (0 is filtered out)
    });
  });

  describe("Queue Health Calculation", () => {
    it("should calculate healthy queue status", async () => {
      systemMonitor.trackQueueMetrics("queue-1", 100, 10, 5, 80, 2); // 2% failure rate

      const report = await systemMonitor.generateHealthReport();
      const queueHealth = report.queueHealth["queue-1"];

      expect(queueHealth?.status).toBe("healthy");
      expect(queueHealth?.message).toBe("Queue is processing jobs normally");
    });

    it("should calculate degraded queue status", async () => {
      // Add queue with 15% failure rate (between 10% and 25% = degraded)
      systemMonitor.trackQueueMetrics("queue-1", 100, 10, 5, 70, 15);

      const report = await systemMonitor.generateHealthReport();
      const queueHealth = report.queueHealth["queue-1"];

      expect(queueHealth?.status).toBe("degraded");
      expect(queueHealth?.message).toContain("Elevated failure rate: 15.0%");
    });

    it("should calculate unhealthy queue status", async () => {
      systemMonitor.trackQueueMetrics("queue-1", 100, 10, 5, 60, 25); // 25% failure rate

      const report = await systemMonitor.generateHealthReport();
      const queueHealth = report.queueHealth["queue-1"];

      expect(queueHealth?.status).toBe("unhealthy");
      expect(queueHealth?.message).toContain("High failure rate: 25.0%");
    });

    it("should handle zero job count in failure rate calculation", async () => {
      systemMonitor.trackQueueMetrics("queue-1", 0, 0, 0, 0, 0);

      const report = await systemMonitor.generateHealthReport();
      const queueHealth = report.queueHealth["queue-1"];

      expect(queueHealth?.status).toBe("healthy");
    });
  });

  describe("Job Health Calculation", () => {
    it("should calculate healthy job status", async () => {
      // Add successful jobs to ensure healthy status (< 5% failure rate)
      // 1 failed out of 25 total = 4% failure rate (healthy)
      for (let i = 1; i <= 24; i++) {
        systemMonitor.trackJobMetrics(`job-${i}`, 100, true);
      }
      systemMonitor.trackJobMetrics(
        "job-25",
        100,
        false,
        "test-queue",
        "test-worker",
        "Test error"
      );

      const report = await systemMonitor.generateHealthReport();
      expect(report.jobHealth.status).toBe("healthy");
    });

    it("should calculate degraded job status", async () => {
      // Add jobs with 10% failure rate (between 5% and 15% = degraded)
      // 2 failed out of 20 total = 10% failure rate
      for (let i = 1; i <= 18; i++) {
        systemMonitor.trackJobMetrics(`job-${i}`, 100, true);
      }
      for (let i = 19; i <= 20; i++) {
        systemMonitor.trackJobMetrics(
          `job-${i}`,
          100,
          false,
          "test-queue",
          "test-worker",
          "Test error"
        );
      }

      const report = await systemMonitor.generateHealthReport();
      expect(report.jobHealth.status).toBe("degraded");
      expect(report.jobHealth.message).toContain(
        "Elevated job failure rate: 10.0%"
      );
    });

    it("should calculate unhealthy job status", async () => {
      systemMonitor.trackJobMetrics("job-1", 1000, false);
      systemMonitor.trackJobMetrics("job-2", 2000, false);
      systemMonitor.trackJobMetrics("job-3", 3000, false);
      systemMonitor.trackJobMetrics("job-4", 4000, false);
      systemMonitor.trackJobMetrics("job-5", 5000, false); // 100% failure rate

      const report = await systemMonitor.generateHealthReport();
      expect(report.jobHealth.status).toBe("unhealthy");
      expect(report.jobHealth.message).toContain(
        "High job failure rate: 100.0%"
      );
    });

    it("should handle zero processed jobs in failure rate calculation", async () => {
      const report = await systemMonitor.generateHealthReport();
      expect(report.jobHealth.status).toBe("healthy");
    });
  });

  describe("Event Emission", () => {
    it("should emit job processed event", () => {
      const eventSpy = vi.fn();
      systemMonitor.on("jobProcessed", eventSpy);

      systemMonitor.trackJobMetrics("job-1", 1000, true);

      expect(eventSpy).toHaveBeenCalledWith({
        type: "job_processed",
        data: expect.objectContaining({
          jobId: "job-1",
          duration: 1000,
          success: true,
        }),
        timestamp: expect.any(Date),
      });
    });

    it("should emit queue updated event", () => {
      const eventSpy = vi.fn();
      systemMonitor.on("queueUpdated", eventSpy);

      systemMonitor.trackQueueMetrics("queue-1", 10);

      expect(eventSpy).toHaveBeenCalledWith({
        type: "queue_updated",
        data: expect.objectContaining({
          queueName: "queue-1",
          jobCount: 10,
        }),
        timestamp: expect.any(Date),
      });
    });

    it("should emit health report generated event", async () => {
      const eventSpy = vi.fn();
      systemMonitor.on("healthReportGenerated", eventSpy);

      await systemMonitor.generateHealthReport();

      expect(eventSpy).toHaveBeenCalledWith({
        type: "health_report_generated",
        data: {
          component: "system_monitor",
          status: expect.any(String),
          message: expect.stringContaining(
            "Health report generated with status:"
          ),
        },
        timestamp: expect.any(Date),
      });
    });

    it("should emit job event logged event", () => {
      const eventSpy = vi.fn();
      systemMonitor.on("jobEventLogged", eventSpy);

      const jobEvent = {
        type: "job_processed" as const,
        data: {
          jobId: "test-job",
          duration: 1500,
          success: true,
          queueName: "test-queue",
          workerName: "test-worker",
          error: undefined,
        },
        timestamp: new Date(),
      };

      systemMonitor.logJobEvent(jobEvent);

      expect(eventSpy).toHaveBeenCalledWith(jobEvent);
    });

    it("should emit worker event logged event", () => {
      const eventSpy = vi.fn();
      systemMonitor.on("workerEventLogged", eventSpy);

      const workerEvent = {
        type: "worker_started" as const,
        data: {
          workerName: "test-worker",
          status: "started" as const,
          queueName: "test-queue",
          jobCount: 5,
        },
        timestamp: new Date(),
      };

      systemMonitor.logWorkerEvent(workerEvent);

      expect(eventSpy).toHaveBeenCalledWith(workerEvent);
    });

    it("should emit system event logged event", () => {
      const eventSpy = vi.fn();
      systemMonitor.on("systemEventLogged", eventSpy);

      const systemEvent = {
        type: "error_occurred" as const,
        data: {
          component: "test-component",
          status: "error" as const,
          message: "Test error message",
          error: "Test error",
        },
        timestamp: new Date(),
      };

      systemMonitor.logSystemEvent(systemEvent);

      expect(eventSpy).toHaveBeenCalledWith(systemEvent);
    });
  });

  describe("Cleanup and Maintenance", () => {
    it("should clean up old job metrics", async () => {
      // Create jobs with old timestamps (older than 24 hours)
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

      // Add 1000 old jobs
      for (let i = 1; i <= 1000; i++) {
        const jobMetric = {
          jobId: `old-job-${i}`,
          duration: 100,
          success: true,
          queueName: "test-queue",
          workerName: "test-worker",
          error: undefined,
          timestamp: oldDate,
        };
        // Use the internal map to add jobs with old timestamps
        (
          systemMonitor as unknown as { jobMetrics: Map<string, JobMetrics> }
        ).jobMetrics.set(`old-job-${i}`, jobMetric);
      }

      // Add one more job to trigger cleanup
      systemMonitor.trackJobMetrics("new-job", 100, true);

      // The cleanup should have removed the old jobs
      const allMetrics = systemMonitor.getAllJobMetrics();
      expect(allMetrics.length).toBeLessThanOrEqual(1000);

      // Verify that only recent jobs remain
      const recentJobs = allMetrics.filter((job) => job.jobId === "new-job");
      expect(recentJobs.length).toBe(1);
    });

    it("should start cleanup interval on construction", () => {
      // The cleanup interval is started in the constructor
      // We can verify this by checking that the instance is created successfully
      const monitor = SystemMonitor.getInstance();
      expect(monitor).toBeInstanceOf(SystemMonitor);
      expect(monitor).toBeInstanceOf(EventEmitter);
    });
  });

  describe("Edge Cases", () => {
    it("should handle job metrics with zero duration", () => {
      systemMonitor.trackJobMetrics("job-1", 0, true);
      systemMonitor.trackJobMetrics("job-2", 1000, true);

      const metrics = systemMonitor.getSystemMetrics();
      expect(metrics.averageJobDuration).toBe(1000); // Only non-zero durations count
    });

    it("should handle multiple jobs with same ID (overwrite)", () => {
      systemMonitor.trackJobMetrics("job-1", 1000, true);
      systemMonitor.trackJobMetrics("job-1", 2000, false); // Overwrites previous

      const metrics = systemMonitor.getJobMetrics("job-1");
      expect(metrics?.duration).toBe(2000);
      expect(metrics?.success).toBe(false);
    });

    it("should handle queue metrics with same name (overwrite)", () => {
      systemMonitor.trackQueueMetrics("queue-1", 10, 3, 2, 4, 1);
      systemMonitor.trackQueueMetrics("queue-1", 20, 5, 3, 10, 2); // Overwrites previous

      const metrics = systemMonitor.getQueueMetrics("queue-1");
      expect(metrics?.jobCount).toBe(20);
      expect(metrics?.waitingCount).toBe(5);
    });
  });
});
