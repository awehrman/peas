/* eslint-disable @typescript-eslint/ban-ts-comment -- Test file with expected non-null values */
// @ts-nocheck - Test file with expected non-null values
import { describe, it, expect, beforeEach } from "vitest";
import { MetricsCollector, globalMetrics, WorkerMetrics } from "../metrics";

describe("MetricsCollector", () => {
  let metrics: MetricsCollector;
  beforeEach(() => {
    metrics = new MetricsCollector();
  });

  it("increments a counter metric", () => {
    metrics.increment("test.counter");
    const metric = metrics.getMetric("test.counter");
    expect(metric).toBeTruthy();
    if (!metric) throw new Error("Metric should exist");
    expect(metric.type).toBe("counter");
    expect(metric.values.length).toBe(1);
    if (!metric.values[0]) throw new Error("Metric value should exist");
    expect(metric.values[0].value).toBe(1);
  });

  it("increments with custom value and tags", () => {
    metrics.increment("test.counter", 5, { foo: "bar" });
    const metric = metrics.getMetric("test.counter");
    expect(metric).toBeTruthy();
    if (!metric) throw new Error("Metric should exist");
    if (!metric.values[0]) throw new Error("Metric value should exist");
    expect(metric.values[0].value).toBe(5);
    expect(metric.values[0].tags).toEqual({ foo: "bar" });
  });

  it("sets a gauge metric", () => {
    metrics.gauge("test.gauge", 42);
    const metric = metrics.getMetric("test.gauge");
    expect(metric).toBeTruthy();
    if (!metric) throw new Error("Metric should exist");
    expect(metric.type).toBe("gauge");
    if (!metric.values[0]) throw new Error("Metric value should exist");
    expect(metric.values[0].value).toBe(42);
  });

  it("records a histogram value", () => {
    metrics.histogram("test.hist", 3.14);
    const metric = metrics.getMetric("test.hist");
    expect(metric).toBeTruthy();
    if (!metric) throw new Error("Metric should exist");
    expect(metric.type).toBe("histogram");
    if (!metric.values[0]) throw new Error("Metric value should exist");
    expect(metric.values[0].value).toBe(3.14);
  });

  it("getAllMetrics returns all metrics", () => {
    metrics.increment("a");
    metrics.gauge("b", 2);
    expect(metrics.getAllMetrics().length).toBe(2);
  });

  it("clearOldMetrics keeps only last N values", () => {
    for (let i = 0; i < 10; i++) metrics.increment("c");
    metrics.clearOldMetrics(3);
    const metric = metrics.getMetric("c");
    expect(metric).toBeTruthy();
    if (!metric) throw new Error("Metric should exist");
    expect(metric.values.length).toBe(3);
  });

  it("getMetricSummary returns correct stats", () => {
    metrics.increment("sum", 2);
    metrics.increment("sum", 4);
    metrics.increment("sum", 6);
    const summary = metrics.getMetricSummary("sum");
    expect(summary).toEqual({
      count: 3,
      sum: 12,
      avg: 4,
      min: 2,
      max: 6,
      latest: 6,
    });
  });

  it("getMetricSummary returns null for missing or empty metric", () => {
    expect(metrics.getMetricSummary("none")).toBeNull();
    metrics.increment("empty");
    metrics.clearOldMetrics(0);
    // Remove the metric entirely to simulate missing/empty
    (metrics as any).metrics.delete("empty"); // eslint-disable-line @typescript-eslint/no-explicit-any -- Access private property for test
    expect(metrics.getMetricSummary("empty")).toBeNull();
  });
});

describe("globalMetrics singleton", () => {
  beforeEach(() => {
    // Clear global metrics before each test
    globalMetrics.clearOldMetrics(0);
  });
  it("is a MetricsCollector instance", () => {
    expect(globalMetrics).toBeInstanceOf(MetricsCollector);
  });
  it("can record and retrieve metrics globally", () => {
    globalMetrics.increment("global");
    expect(globalMetrics.getMetric("global")).toBeDefined();
  });
});

describe("WorkerMetrics helpers", () => {
  beforeEach(() => {
    globalMetrics.clearOldMetrics(0);
  });
  it("recordJobProcessingTime records all relevant metrics", () => {
    WorkerMetrics.recordJobProcessingTime("parse", 123, true);
    expect(globalMetrics.getMetric("worker.job.processing_time")).toBeTruthy();
    const total = globalMetrics.getMetric("worker.job.total");
    expect(total).toBeTruthy();
    if (!total) throw new Error("Total metric should exist");
    expect(total.values[0].tags).toEqual({ operation: "parse" });
    const success = globalMetrics.getMetric("worker.job.success");
    expect(success).toBeTruthy();
    if (!success) throw new Error("Success metric should exist");
    expect(success.values[0].value).toBe(1);
    const failure = globalMetrics.getMetric("worker.job.failure");
    expect(failure).toBeTruthy();
    if (!failure) throw new Error("Failure metric should exist");
    expect(failure.values[0].value).toBe(0);
  });
  it("recordJobProcessingTime records failure correctly", () => {
    WorkerMetrics.recordJobProcessingTime("parse", 50, false);
    const success = globalMetrics.getMetric("worker.job.success");
    expect(success).toBeTruthy();
    if (!success) throw new Error("Success metric should exist");
    const successValues = success.values;
    expect(successValues[successValues.length - 1].value).toBe(0);
    const failure = globalMetrics.getMetric("worker.job.failure");
    expect(failure).toBeTruthy();
    if (!failure) throw new Error("Failure metric should exist");
    const failureValues = failure.values;
    expect(failureValues[failureValues.length - 1].value).toBe(1);
  });
  it("recordActionExecutionTime records all relevant metrics", () => {
    WorkerMetrics.recordActionExecutionTime("save", 77, true);
    expect(
      globalMetrics.getMetric("worker.action.execution_time")
    ).toBeTruthy();
    const total = globalMetrics.getMetric("worker.action.total");
    expect(total).toBeTruthy();
    if (!total) throw new Error("Total metric should exist");
    expect(total.values[0].tags).toEqual({ action: "save" });
    const success = globalMetrics.getMetric("worker.action.success");
    expect(success).toBeTruthy();
    if (!success) throw new Error("Success metric should exist");
    expect(success.values[0].value).toBe(1);
    const failure = globalMetrics.getMetric("worker.action.failure");
    expect(failure).toBeTruthy();
    if (!failure) throw new Error("Failure metric should exist");
    expect(failure.values[0].value).toBe(0);
  });
  it("recordQueueDepth records a gauge", () => {
    WorkerMetrics.recordQueueDepth("main", 42);
    const metric = globalMetrics.getMetric("worker.queue.depth");
    expect(metric).toBeTruthy();
    if (!metric) throw new Error("Metric should exist");
    expect(metric.type).toBe("gauge");
    expect(metric.values[0].tags).toEqual({ queue: "main" });
    expect(metric.values[0].value).toBe(42);
  });
  it("recordWorkerStatus records a gauge", () => {
    WorkerMetrics.recordWorkerStatus("w1", true);
    const metric = globalMetrics.getMetric("worker.status");
    expect(metric).toBeTruthy();
    if (!metric) throw new Error("Metric should exist");
    expect(metric.type).toBe("gauge");
    expect(metric.values[0].tags).toEqual({ worker: "w1" });
    expect(metric.values[0].value).toBe(1);
    WorkerMetrics.recordWorkerStatus("w1", false);
    const statusMetric = globalMetrics.getMetric("worker.status");
    if (!statusMetric) throw new Error("Status metric should exist");
    expect(statusMetric.values[1].value).toBe(0);
  });
});
