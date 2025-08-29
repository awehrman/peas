/**
 * WebSocket Manager Provider Interface
 * Defines the contract for WebSocket connections and real-time communication
 */

export interface WebSocketConnection {
  id: string;
  userId?: string;
  sessionId: string;
  importId?: string;
  status: "connecting" | "connected" | "disconnected" | "reconnecting";
  createdAt: string;
  lastActivity: string;
  metadata?: Record<string, unknown>;
  context?: WebSocketContext;
}

export interface WebSocketContext {
  featureName: string;
  operation: string;
  userId?: string;
  sessionId: string;
  importId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface WebSocketMessage {
  id: string;
  type: string;
  payload: unknown;
  timestamp: string;
  sender: {
    connectionId: string;
    userId?: string;
  };
  recipients?: string[]; // connection IDs
  metadata?: Record<string, unknown>;
}

export interface WebSocketSubscription {
  id: string;
  connectionId: string;
  topic: string;
  filter?: Record<string, unknown>;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface WebSocketProvider {
  /**
   * Connect a WebSocket client
   */
  connect(
    sessionId: string,
    context?: Partial<WebSocketContext>
  ): Promise<WebSocketConnection>;

  /**
   * Disconnect a WebSocket client
   */
  disconnect(connectionId: string): Promise<void>;

  /**
   * Send a message to a specific connection
   */
  sendMessage(
    connectionId: string,
    type: string,
    payload: unknown,
    metadata?: Record<string, unknown>
  ): Promise<void>;

  /**
   * Broadcast a message to multiple connections
   */
  broadcastMessage(
    type: string,
    payload: unknown,
    filter?: {
      userIds?: string[];
      importIds?: string[];
      connectionIds?: string[];
    },
    metadata?: Record<string, unknown>
  ): Promise<void>;

  /**
   * Subscribe to a topic
   */
  subscribe(
    connectionId: string,
    topic: string,
    filter?: Record<string, unknown>
  ): Promise<WebSocketSubscription>;

  /**
   * Unsubscribe from a topic
   */
  unsubscribe(
    connectionId: string,
    subscriptionId: string
  ): Promise<void>;

  /**
   * Publish a message to a topic
   */
  publish(
    topic: string,
    payload: unknown,
    filter?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<void>;

  /**
   * Get connection information
   */
  getConnection(connectionId: string): Promise<WebSocketConnection | null>;

  /**
   * Get all connections for a user
   */
  getUserConnections(userId: string): Promise<WebSocketConnection[]>;

  /**
   * Get all connections for an import
   */
  getImportConnections(importId: string): Promise<WebSocketConnection[]>;

  /**
   * Get all active connections
   */
  getActiveConnections(): Promise<WebSocketConnection[]>;

  /**
   * Clean up inactive connections
   */
  cleanupInactiveConnections(timeoutMinutes: number): Promise<number>;

  /**
   * Get connection statistics
   */
  getConnectionStats(
    timeRange?: { since: Date; until: Date }
  ): Promise<{
    totalConnections: number;
    activeConnections: number;
    connectionsByStatus: Record<WebSocketConnection["status"], number>;
    messagesSent: number;
    messagesReceived: number;
    subscriptions: number;
  }>;
}

export interface WebSocketProviderConfig {
  maxConnectionsPerUser: number;
  connectionTimeout: number; // milliseconds
  heartbeatInterval: number; // milliseconds
  maxMessageSize: number; // bytes
  enableCompression: boolean;
  enableMetrics: boolean;
  allowedOrigins: string[];
  rateLimitMessages: number; // messages per minute
}
