import { describe, it, expect } from "vitest";
import { createLogger, EnhancedLoggerService } from "../../logger";
import type { LogConfig } from "../../logger";

describe("createLogger", () => {
  it("createLogger returns EnhancedLoggerService", () => {
    const config: LogConfig = {
      logDir: "/tmp/logs",
      enableFileLogging: true,
      enableConsoleLogging: true,
      logLevel: "debug",
    };
    const l = createLogger(config);
    expect(l).toBeInstanceOf(EnhancedLoggerService);
  });
});
