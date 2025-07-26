import { describe, expect, it } from "vitest";

import {
  DEFAULT_MONITORING_CONFIG,
  QueueMonitor,
  SystemMonitor,
  queueMonitor,
  systemMonitor,
} from "../index";

describe("Monitoring Index Exports", () => {
  describe("Class Exports", () => {
    it("should export SystemMonitor class", () => {
      expect(SystemMonitor).toBeDefined();
      expect(typeof SystemMonitor).toBe("function");
      expect(SystemMonitor.name).toBe("SystemMonitor");
    });

    it("should export systemMonitor singleton instance", () => {
      expect(systemMonitor).toBeDefined();
      expect(systemMonitor).toBeInstanceOf(SystemMonitor);
    });

    it("should export QueueMonitor class", () => {
      expect(QueueMonitor).toBeDefined();
      expect(typeof QueueMonitor).toBe("function");
      expect(QueueMonitor.name).toBe("QueueMonitor");
    });

    it("should export queueMonitor singleton instance", () => {
      expect(queueMonitor).toBeDefined();
      expect(queueMonitor).toBeInstanceOf(QueueMonitor);
    });
  });

  describe("Configuration Exports", () => {
    it("should export DEFAULT_MONITORING_CONFIG", () => {
      expect(DEFAULT_MONITORING_CONFIG).toBeDefined();
      expect(typeof DEFAULT_MONITORING_CONFIG).toBe("object");
    });

    it("should have required properties in DEFAULT_MONITORING_CONFIG", () => {
      expect(DEFAULT_MONITORING_CONFIG).toHaveProperty("enabled");
      expect(DEFAULT_MONITORING_CONFIG).toHaveProperty("metricsRetentionHours");
      expect(DEFAULT_MONITORING_CONFIG).toHaveProperty("healthCheckIntervalMs");
      expect(DEFAULT_MONITORING_CONFIG).toHaveProperty("cleanupIntervalMs");
      expect(DEFAULT_MONITORING_CONFIG).toHaveProperty("maxMetricsHistory");
      expect(DEFAULT_MONITORING_CONFIG).toHaveProperty("logLevel");
    });
  });

  describe("Singleton Behavior", () => {
    it("should return the same systemMonitor instance on multiple imports", async () => {
      // Import the module again to test singleton behavior
      const { systemMonitor: monitor1 } = await import("../index");
      const { systemMonitor: monitor2 } = await import("../index");

      expect(monitor1).toBe(monitor2);
    });

    it("should return the same queueMonitor instance on multiple imports", async () => {
      // Import the module again to test singleton behavior
      const { queueMonitor: monitor1 } = await import("../index");
      const { queueMonitor: monitor2 } = await import("../index");

      expect(monitor1).toBe(monitor2);
    });
  });

  describe("Module Structure", () => {
    it("should export all expected monitoring components", () => {
      // Import the module to check exports
      const monitoringModule = {
        SystemMonitor,
        systemMonitor,
        QueueMonitor,
        queueMonitor,
        DEFAULT_MONITORING_CONFIG,
      };

      // Check that all expected exports exist
      expect(monitoringModule).toHaveProperty("SystemMonitor");
      expect(monitoringModule).toHaveProperty("systemMonitor");
      expect(monitoringModule).toHaveProperty("QueueMonitor");
      expect(monitoringModule).toHaveProperty("queueMonitor");
      expect(monitoringModule).toHaveProperty("DEFAULT_MONITORING_CONFIG");
    });

    it("should not export unexpected properties", () => {
      const expectedExports = [
        "SystemMonitor",
        "systemMonitor",
        "QueueMonitor",
        "queueMonitor",
        "DEFAULT_MONITORING_CONFIG",
      ];

      const actualExports = Object.keys({
        SystemMonitor,
        systemMonitor,
        QueueMonitor,
        queueMonitor,
        DEFAULT_MONITORING_CONFIG,
      });
      
      const unexpectedExports = actualExports.filter(
        (exportName) => !expectedExports.includes(exportName)
      );

      expect(unexpectedExports).toHaveLength(0);
    });
  });

  describe("Integration with SystemMonitor", () => {
    it("should allow access to SystemMonitor methods through exported instance", () => {
      expect(typeof systemMonitor.trackJobMetrics).toBe("function");
      expect(typeof systemMonitor.trackQueueMetrics).toBe("function");
      expect(typeof systemMonitor.generateHealthReport).toBe("function");
    });

    it("should verify SystemMonitor is a singleton", () => {
      // SystemMonitor constructor is private, so we can only access the singleton
      expect(systemMonitor).toBeInstanceOf(SystemMonitor);
      expect(SystemMonitor.getInstance()).toBe(systemMonitor);
    });
  });

  describe("Integration with QueueMonitor", () => {
    it("should allow access to QueueMonitor methods through exported instance", () => {
      expect(typeof queueMonitor.startMonitoring).toBe("function");
      expect(typeof queueMonitor.stopMonitoring).toBe("function");
      expect(typeof queueMonitor.collectQueueMetrics).toBe("function");
    });

    it("should verify QueueMonitor is a singleton", () => {
      // QueueMonitor constructor is private, so we can only access the singleton
      expect(queueMonitor).toBeInstanceOf(QueueMonitor);
      expect(QueueMonitor.getInstance()).toBe(queueMonitor);
    });
  });
});
