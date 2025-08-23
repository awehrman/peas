import { ReactNode } from "react";

import { act, renderHook } from "@testing-library/react";

import {
  ImportStateProvider,
  useImportState,
} from "../../contexts/import-state-context";
import { usePerformanceMonitoring } from "../use-performance-monitoring";

// Mock performance.memory
Object.defineProperty(global.performance, "memory", {
  value: {
    usedJSHeapSize: 1000000,
  },
  configurable: true,
});

// Test wrapper
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ImportStateProvider>{children}</ImportStateProvider>
);

// Combined hook for testing
const useTestHook = () => {
  const importState = useImportState();
  const perfMonitoring = usePerformanceMonitoring({
    enableMemoryMonitoring: true,
    enableRenderTracking: true,
    reportingInterval: 0, // Disable automatic reporting for tests
    logToConsole: false,
  });

  return {
    importState,
    perfMonitoring,
  };
};

describe("usePerformanceMonitoring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should initialize with default metrics", () => {
    const { result } = renderHook(() => useTestHook(), {
      wrapper: TestWrapper,
    });

    const metrics = result.current.perfMonitoring.getCurrentMetrics();

    expect(metrics.itemsProcessed).toBe(0);
    expect(metrics.componentRenderCount).toBeGreaterThan(0); // Should have at least 1 render
    expect(metrics.stateUpdateCount).toBeGreaterThan(0);
    expect(metrics.memoryUsage).toBeDefined();
  });

  it("should track component renders", () => {
    const { result, rerender } = renderHook(() => useTestHook(), {
      wrapper: TestWrapper,
    });

    const initialRenderCount =
      result.current.perfMonitoring.getCurrentMetrics().componentRenderCount;

    // Force re-render
    rerender();

    const newRenderCount =
      result.current.perfMonitoring.getCurrentMetrics().componentRenderCount;
    expect(newRenderCount).toBeGreaterThan(initialRenderCount);
  });

  it("should track state updates", () => {
    const { result } = renderHook(() => useTestHook(), {
      wrapper: TestWrapper,
    });

    const initialUpdateCount =
      result.current.perfMonitoring.getCurrentMetrics().stateUpdateCount;

    act(() => {
      result.current.importState.addUploadingHtmlFiles(["test.html"]);
    });

    const newUpdateCount =
      result.current.perfMonitoring.getCurrentMetrics().stateUpdateCount;
    expect(newUpdateCount).toBeGreaterThan(initialUpdateCount);
  });

  it("should track items processed", () => {
    const { result } = renderHook(() => useTestHook(), {
      wrapper: TestWrapper,
    });

    act(() => {
      result.current.importState.addUploadItem({
        importId: "test-1",
        htmlFileName: "test.html",
        imageCount: 5,
        status: "uploading",
        createdAt: new Date(),
      });
    });

    const metrics = result.current.perfMonitoring.getCurrentMetrics();
    expect(metrics.itemsProcessed).toBe(1);
  });

  it("should track upload performance", () => {
    const { result } = renderHook(() => useTestHook(), {
      wrapper: TestWrapper,
    });

    // Start upload
    act(() => {
      result.current.importState.addUploadItem({
        importId: "test-1",
        htmlFileName: "test.html",
        imageCount: 5,
        status: "uploading",
        createdAt: new Date(),
      });
    });

    let metrics = result.current.perfMonitoring.getCurrentMetrics();
    expect(metrics.uploadStartTime).toBeDefined();

    // Complete upload
    act(() => {
      result.current.importState.updateUploadItem("test-1", {
        status: "uploaded",
      });
    });

    metrics = result.current.perfMonitoring.getCurrentMetrics();
    expect(metrics.uploadEndTime).toBeDefined();
    expect(metrics.uploadDuration).toBeDefined();
    expect(metrics.avgProcessingTime).toBeDefined();
  });

  it("should track memory usage", () => {
    const { result } = renderHook(() => useTestHook(), {
      wrapper: TestWrapper,
    });

    const metrics = result.current.perfMonitoring.getCurrentMetrics();

    expect(metrics.memoryUsage).toBeDefined();
    expect(metrics.memoryUsage?.initial).toBe(1000000);
    expect(metrics.memoryUsage?.current).toBe(1000000);
    expect(metrics.memoryUsage?.peak).toBeGreaterThanOrEqual(1000000);
  });

  it("should generate performance report with recommendations", () => {
    const { result } = renderHook(() => useTestHook(), {
      wrapper: TestWrapper,
    });

    // Add some activity to generate meaningful recommendations
    act(() => {
      result.current.importState.addUploadItem({
        importId: "test-1",
        htmlFileName: "test.html",
        imageCount: 5,
        status: "uploading",
        createdAt: new Date(),
      });
    });

    const report = result.current.perfMonitoring.generateReport();

    expect(report.summary).toContain("Performance Report:");
    expect(report.summary).toContain("Items processed:");
    expect(report.summary).toContain("Component renders:");
    expect(report.summary).toContain("Memory efficiency:");
    expect(Array.isArray(report.recommendations)).toBe(true);
  });

  it("should provide recommendations for high render count", () => {
    const { result } = renderHook(() => useTestHook(), {
      wrapper: TestWrapper,
    });

    // Simulate high render count by forcing many re-renders
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.importState.addUploadingHtmlFiles([`file-${i}.html`]);
        result.current.importState.removeUploadingHtmlFiles([`file-${i}.html`]);
      });
    }

    const report = result.current.perfMonitoring.generateReport();

    const hasRenderRecommendation = report.recommendations.some((rec) =>
      rec.includes("memoizing components")
    );
    expect(hasRenderRecommendation).toBe(true);
  });

  it("should reset metrics correctly", () => {
    const { result } = renderHook(() => useTestHook(), {
      wrapper: TestWrapper,
    });

    // Add some activity
    act(() => {
      result.current.importState.addUploadItem({
        importId: "test-1",
        htmlFileName: "test.html",
        imageCount: 5,
        status: "uploading",
        createdAt: new Date(),
      });
    });

    // Reset metrics
    act(() => {
      result.current.perfMonitoring.resetMetrics();
    });

    const metrics = result.current.perfMonitoring.getCurrentMetrics();
    expect(metrics.componentRenderCount).toBe(0);
    expect(metrics.stateUpdateCount).toBe(0);
    expect(metrics.uploadStartTime).toBeUndefined();
    expect(metrics.uploadEndTime).toBeUndefined();
  });

  it("should handle missing performance.memory gracefully", () => {
    // Temporarily remove performance.memory
    const originalMemory = (global.performance as any).memory;
    delete (global.performance as any).memory;

    const { result } = renderHook(() => useTestHook(), {
      wrapper: TestWrapper,
    });

    const metrics = result.current.perfMonitoring.getCurrentMetrics();
    expect(metrics.memoryUsage?.initial).toBe(0);

    // Restore memory
    (global.performance as any).memory = originalMemory;
  });

  it("should provide idle time recommendations", () => {
    const { result } = renderHook(() => useTestHook(), {
      wrapper: TestWrapper,
    });

    // Add some items
    act(() => {
      result.current.importState.addUploadItem({
        importId: "test-1",
        htmlFileName: "test.html",
        imageCount: 5,
        status: "uploaded",
        createdAt: new Date(),
      });
    });

    // Fast forward time to simulate long idle period
    const realDateNow = Date.now;
    const mockTime = Date.now() + 70000; // 70 seconds later
    Date.now = jest.fn(() => mockTime);

    const report = result.current.perfMonitoring.generateReport();

    const hasIdleRecommendation = report.recommendations.some((rec) =>
      rec.includes("Long idle time detected")
    );
    expect(hasIdleRecommendation).toBe(true);

    // Restore Date.now
    Date.now = realDateNow;
  });
});
