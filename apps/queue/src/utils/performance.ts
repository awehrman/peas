interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  operation: string;
  noteId?: string;
  context?: string;
}

class PerformanceTracker {
  private metrics: Map<string, PerformanceMetrics> = new Map();

  start(operation: string, noteId?: string, context?: string): string {
    const id = `${operation}-${noteId || "unknown"}-${Date.now()}`;
    this.metrics.set(id, {
      startTime: Date.now(),
      operation,
      noteId,
      context,
    });
    return id;
  }

  end(id: string): PerformanceMetrics | null {
    const metric = this.metrics.get(id);
    if (!metric) return null;

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;

    // Log performance data
    console.log(
      `⏱️  ${metric.operation} took ${metric.duration}ms${metric.noteId ? ` for note ${metric.noteId}` : ""}`
    );

    this.metrics.delete(id);
    return metric;
  }

  getAverageDuration(operation: string): number {
    const durations = Array.from(this.metrics.values())
      .filter((m) => m.operation === operation && m.duration)
      .map((m) => m.duration!);

    if (durations.length === 0) return 0;
    return (
      durations.reduce((sum, duration) => sum + duration, 0) / durations.length
    );
  }
}

export const performanceTracker = new PerformanceTracker();

// Decorator for tracking function performance
export function trackPerformance(operation: string) {
  return function (
    target: object,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const noteId =
        (args[0] as { data?: { noteId?: string; note?: { id?: string } } })
          ?.data?.noteId ||
        (args[0] as { data?: { noteId?: string; note?: { id?: string } } })
          ?.data?.note?.id;
      const id = performanceTracker.start(operation, noteId);

      try {
        const result = await method.apply(this, args);
        performanceTracker.end(id);
        return result;
      } catch (error) {
        performanceTracker.end(id);
        throw error;
      }
    };
  };
}
