import { CacheManager } from "./cache";
import { DatabaseManager } from "./database-manager";

import { HealthMonitor } from "../utils/health-monitor";
import { MetricsCollector } from "../utils/metrics";
import {
  WebSocketManager,
  initializeWebSocketServer,
} from "../websocket-server";

// ============================================================================
// MANAGER FACTORY CLASS
// ============================================================================

/**
 * Factory class for creating manager instances.
 * Provides centralized manager creation with configuration support.
 */
export class ManagerFactory {
  private static managers = new Map<string, unknown>();

  /**
   * Create a WebSocket manager instance.
   * @param port - WebSocket server port
   * @returns WebSocketManager instance
   */
  static createWebSocketManager(port: number = 8080): WebSocketManager {
    const key = `websocket-${port}`;

    if (!this.managers.has(key)) {
      // Use the singleton pattern to ensure consistency
      this.managers.set(key, initializeWebSocketServer(port));
    }

    return this.managers.get(key) as WebSocketManager;
  }

  /**
   * Create a database manager instance.
   * @returns DatabaseManager instance
   */
  static createDatabaseManager(): DatabaseManager {
    const key = "database";

    if (!this.managers.has(key)) {
      this.managers.set(key, DatabaseManager.getInstance());
    }

    return this.managers.get(key) as DatabaseManager;
  }

  /**
   * Create a cache manager instance.
   * @returns CacheManager instance
   */
  static createCacheManager(): CacheManager {
    const key = "cache";

    if (!this.managers.has(key)) {
      this.managers.set(key, CacheManager.getInstance());
    }

    return this.managers.get(key) as CacheManager;
  }

  /**
   * Create a health monitor instance.
   * @returns HealthMonitor instance
   */
  static createHealthMonitor(): HealthMonitor {
    const key = "health";

    if (!this.managers.has(key)) {
      this.managers.set(key, HealthMonitor.getInstance());
    }

    return this.managers.get(key) as HealthMonitor;
  }

  /**
   * Create a metrics collector instance.
   * @returns MetricsCollector instance
   */
  static createMetricsCollector(): MetricsCollector {
    const key = "metrics";

    if (!this.managers.has(key)) {
      this.managers.set(key, MetricsCollector.getInstance());
    }

    return this.managers.get(key) as MetricsCollector;
  }

  /**
   * Get an existing manager instance by type.
   * @param type - Manager type
   * @returns Manager instance or undefined if not found
   */
  static getManager<T>(type: string): T | undefined {
    return this.managers.get(type) as T | undefined;
  }

  /**
   * Clear all manager instances (useful for testing).
   */
  static clearManagers(): void {
    this.managers.clear();
  }

  /**
   * Get all registered manager types.
   * @returns Array of manager type keys
   */
  static getManagerTypes(): string[] {
    return Array.from(this.managers.keys());
  }
}
