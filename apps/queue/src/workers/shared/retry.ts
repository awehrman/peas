import { BaseAction } from "../core/base-action";
import { ActionContext } from "../core/types";
import type { StructuredLogger } from "../core/types";
import type { BaseJobData } from "../types";

export interface RetryDeps {
  logger?: StructuredLogger;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface RetryData {
  attempt: number;
  maxAttempts: number;
  lastError?: Error;
  context?: Record<string, unknown>;
}

export interface RetryJobData extends BaseJobData {
  attempt: number;
  maxAttempts: number;
  lastError?: Error;
  context?: Record<string, unknown>;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Action that implements exponential backoff retry logic.
 */
export class RetryAction extends BaseAction<RetryJobData, RetryDeps> {
  name = "retry";
  constructor(private config: RetryConfig = DEFAULT_RETRY_CONFIG) {
    super();
  }
  /**
   * Execute the retry action, applying exponential backoff and optional jitter.
   */
  async execute(data: RetryJobData, deps: RetryDeps, context: ActionContext) {
    const { attempt = 0, maxAttempts = this.config.maxAttempts } = data;
    if (attempt >= maxAttempts) {
      throw new Error(
        `Max retry attempts (${maxAttempts}) exceeded for job ${context.jobId}`
      );
    }
    // Calculate delay with exponential backoff
    const delay = this.calculateDelay(attempt);
    if (attempt > 0) {
      const message = `Retrying job ${context.jobId} (attempt ${attempt + 1}/${maxAttempts}) after ${delay}ms`;
      if (deps.logger?.log) {
        deps.logger.log(message, "warn", {
          jobId: context.jobId,
          attempt,
          delay,
        });
      } else {
        console.warn(message);
      }
      // Wait before retrying
      await this.sleep(delay);
    }
    return { ...data, attempt: attempt + 1 };
  }

  private calculateDelay(attempt: number): number {
    let delay =
      this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt);

    // Add jitter to prevent thundering herd
    if (this.config.jitter) {
      const jitter = Math.random() * 0.1 * delay;
      delay += jitter;
    }

    return Math.min(delay, this.config.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Action that wraps another action with retry logic.
 */
export class RetryWrapperAction<
  TData extends BaseJobData,
  TDeps extends object,
> extends BaseAction<TData, TDeps> {
  name: string;
  constructor(
    private wrappedAction: BaseAction<TData, TDeps>,
    private config: RetryConfig = DEFAULT_RETRY_CONFIG
  ) {
    super();
    this.name = `retry_wrapper(${wrappedAction.name})`;
  }
  /**
   * Execute the wrapped action with retry logic.
   */
  async execute(data: TData, deps: TDeps, context: ActionContext) {
    let lastError: Error;
    for (let attempt = 0; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const result = await this.wrappedAction.execute(data, deps, context);
        return result;
      } catch (error) {
        lastError = error as Error;
        if (attempt === this.config.maxAttempts) {
          throw lastError;
        }
        // Calculate delay and wait
        const delay = this.calculateDelay(attempt);
        const message = `Retrying ${this.wrappedAction.name} for job ${context.jobId} (attempt ${attempt + 1}/${this.config.maxAttempts + 1}) after ${delay}ms`;
        const logger = (
          deps as {
            logger?: {
              log?: (
                msg: string,
                level: string,
                meta?: Record<string, unknown>
              ) => void;
            };
          }
        ).logger;
        if (logger?.log) {
          logger.log(message, "warn", {
            jobId: context.jobId,
            attempt,
            delay,
          });
        } else {
          console.warn(message);
        }
        await this.sleep(delay);
      }
    }
    throw lastError!;
  }

  private calculateDelay(attempt: number): number {
    let delay =
      this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt);

    if (this.config.jitter) {
      const jitter = Math.random() * 0.1 * delay;
      delay += jitter;
    }

    return Math.min(delay, this.config.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Action that implements circuit breaker pattern.
 */
export class CircuitBreakerAction<
  TData extends BaseJobData,
  TDeps extends object,
> extends BaseAction<TData, TDeps> {
  name = "circuit_breaker";
  private static breakers = new Map<
    string,
    {
      failures: number;
      lastFailure: number;
      state: "CLOSED" | "OPEN" | "HALF_OPEN";
    }
  >();
  constructor(
    private wrappedAction: BaseAction<TData, TDeps>,
    private config: {
      failureThreshold: number;
      resetTimeout: number;
      breakerKey?: string;
    } = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
    }
  ) {
    super();
  }
  /**
   * Execute the wrapped action with circuit breaker logic.
   */
  async execute(data: TData, deps: TDeps, context: ActionContext) {
    const key = this.config.breakerKey || context.operation;
    const breaker = this.getBreaker(key);
    if (breaker.state === "OPEN") {
      if (Date.now() - breaker.lastFailure > this.config.resetTimeout) {
        breaker.state = "HALF_OPEN";
      } else {
        throw new Error(`Circuit breaker is OPEN for ${key}`);
      }
    }
    try {
      const result = await this.wrappedAction.execute(data, deps, context);
      if (breaker.state === "HALF_OPEN") {
        breaker.state = "CLOSED";
        breaker.failures = 0;
      }
      return result;
    } catch (error) {
      breaker.failures++;
      breaker.lastFailure = Date.now();
      if (breaker.failures >= this.config.failureThreshold) {
        breaker.state = "OPEN";
        const message = `Circuit breaker opened for ${key} after ${breaker.failures} failures`;
        const logger = (
          deps as {
            logger?: {
              log?: (
                msg: string,
                level: string,
                meta?: Record<string, unknown>
              ) => void;
            };
          }
        ).logger;
        if (logger?.log) {
          logger.log(message, "error", {
            key,
            failures: breaker.failures,
          });
        } else {
          console.error(message);
        }
      }
      throw error;
    }
  }

  private getBreaker(key: string) {
    if (!CircuitBreakerAction.breakers.has(key)) {
      CircuitBreakerAction.breakers.set(key, {
        failures: 0,
        lastFailure: 0,
        state: "CLOSED",
      });
    }
    return CircuitBreakerAction.breakers.get(key)!;
  }
}

/**
 * Helper function to create a retry wrapper for any action.
 */
export function withRetry<TData extends BaseJobData, TDeps extends object>(
  action: BaseAction<TData, TDeps>,
  config?: RetryConfig
): RetryWrapperAction<TData, TDeps> {
  return new RetryWrapperAction(action, config);
}

/**
 * Helper function to create a circuit breaker wrapper for any action.
 */
export function withCircuitBreaker<
  TData extends BaseJobData,
  TDeps extends object,
>(
  action: BaseAction<TData, TDeps>,
  config?: {
    failureThreshold: number;
    resetTimeout: number;
    breakerKey?: string;
  }
): CircuitBreakerAction<TData, TDeps> {
  return new CircuitBreakerAction(action, config);
}
