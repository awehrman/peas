import type { NoteStatus } from "@peas/database";
import { randomUUID } from "crypto";
import { WebSocket, WebSocketServer } from "ws";

import { WEBSOCKET_CONSTANTS } from "../config/constants";

interface StatusEvent {
  type: "status_update";
  data: {
    importId: string; // Temporary ID for frontend grouping
    noteId?: string; // Actual note ID once saved
    status: NoteStatus;
    message?: string;
    context?: string;
    errorMessage?: string;
    currentCount?: number;
    totalCount?: number;
    createdAt: Date;
    indentLevel?: number; // Explicit indentation level (0 = main, 1+ = nested)
    metadata?: Record<string, unknown>; // Additional metadata like note title
  };
}

// Optimized event structure for reduced payload size
interface OptimizedStatusEvent {
  type: "status_update";
  data: {
    i: string; // importId (shortened)
    n?: string; // noteId (shortened)
    s: NoteStatus; // status (shortened)
    m?: string; // message (shortened)
    c?: string; // context (shortened)
    e?: string; // errorMessage (shortened)
    cc?: number; // currentCount (shortened)
    tc?: number; // totalCount (shortened)
    t: number; // timestamp (number instead of Date)
    l?: number; // indentLevel (shortened)
    md?: Record<string, unknown>; // metadata (shortened)
  };
}

interface BatchedStatusEvent {
  type: "status_update_batch";
  data: {
    events: OptimizedStatusEvent["data"][];
    batchId: string;
    timestamp: Date;
  };
}

interface Client {
  id: string;
  ws: WebSocket;
  connectedAt: Date;
  lastMessageTime: number;
  lastHeartbeat: number;
  isAlive: boolean;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, Client> = new Map();
  private port: number;
  private readonly MAX_CLIENTS = WEBSOCKET_CONSTANTS.MAX_CLIENTS;
  private readonly RATE_LIMIT_MS = WEBSOCKET_CONSTANTS.RATE_LIMIT_MS;
  private readonly BATCH_INTERVAL_MS = WEBSOCKET_CONSTANTS.BATCH_INTERVAL_MS;
  private readonly MAX_BATCH_SIZE = WEBSOCKET_CONSTANTS.MAX_BATCH_SIZE;
  private readonly HEARTBEAT_INTERVAL_MS =
    WEBSOCKET_CONSTANTS.HEARTBEAT_INTERVAL_MS;
  private readonly CONNECTION_TIMEOUT_MS =
    WEBSOCKET_CONSTANTS.CONNECTION_TIMEOUT_MS;

  // Message batching
  private pendingEvents: StatusEvent["data"][] = [];
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastBatchId = 0;

  // Convert full event to optimized format
  private optimizeEvent(
    event: StatusEvent["data"]
  ): OptimizedStatusEvent["data"] {
    return {
      i: event.importId,
      n: event.noteId,
      s: event.status,
      m: event.message,
      c: event.context,
      e: event.errorMessage,
      cc: event.currentCount,
      tc: event.totalCount,
      t: event.createdAt.getTime(),
      l: event.indentLevel,
      md: event.metadata,
    };
  }

  // Convert optimized event back to full format
  private deoptimizeEvent(
    event: OptimizedStatusEvent["data"]
  ): StatusEvent["data"] {
    return {
      importId: event.i,
      noteId: event.n,
      status: event.s,
      message: event.m,
      context: event.c,
      errorMessage: event.e,
      currentCount: event.cc,
      totalCount: event.tc,
      createdAt: new Date(event.t),
      indentLevel: event.l,
      metadata: event.md,
    };
  }

  constructor(port: number = 8080) {
    this.port = port;
    try {
      this.wss = new WebSocketServer({ port });
      this.setupEventHandlers();
      this.startHeartbeat();
      console.log(
        `🔌 WebSocket: Server created successfully on port ${this.port}`
      );
    } catch (error) {
      /* istanbul ignore next -- @preserve */
      console.error(
        `❌ WebSocket: Failed to create server on port ${this.port}:`,
        error
      );
      /* istanbul ignore next -- @preserve */
      throw error;
    }
  }

  private startHeartbeat() {
    setInterval(() => {
      const now = Date.now();
      for (const [clientId, client] of this.clients.entries()) {
        // Check if client is still alive
        if (now - client.lastHeartbeat > this.HEARTBEAT_INTERVAL_MS * 2) {
          console.log(`🔌 WebSocket: Client ${clientId} timed out, removing`);
          this.clients.delete(clientId);
          continue;
        }

        // Send heartbeat to alive clients
        if (client.isAlive && client.ws.readyState === WebSocket.OPEN) {
          try {
            client.ws.ping();
            client.lastHeartbeat = now;
          } catch {
            console.log(
              `🔌 WebSocket: Failed to ping client ${clientId}, removing`
            );
            this.clients.delete(clientId);
          }
        }
      }
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  private setupEventHandlers() {
    this.wss.on("connection", (ws: WebSocket, _req) => {
      if (this.clients.size >= this.MAX_CLIENTS) {
        ws.close(1013, "Too many connections");
        return;
      }
      const clientId = randomUUID();
      const client: Client = {
        id: clientId,
        ws,
        connectedAt: new Date(),
        lastMessageTime: 0,
        lastHeartbeat: Date.now(),
        isAlive: true,
      };

      this.clients.set(clientId, client);

      // Send welcome message
      this.sendToClient(clientId, {
        type: "connection_established",
        data: { clientId, message: "Connected to status updates" },
      });

      ws.on("message", (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (error: unknown) {
          console.error("❌ WebSocket: Failed to parse client message:", error);
        }
      });

      ws.on("pong", () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.lastHeartbeat = Date.now();
          client.isAlive = true;
        }
      });

      ws.on("close", () => {
        this.clients.delete(clientId);
      });

      ws.on("error", (error: Error) => {
        console.error(`❌ WebSocket: Client ${clientId} error:`, error);
        this.clients.delete(clientId);
      });
    });

    this.wss.on("error", (error) => {
      /* istanbul ignore next -- @preserve */
      console.error("❌ WebSocket: Server error:", error);
    });

    console.log(`🔌 WebSocket: Server started on port ${this.port}`);
  }

  private handleClientMessage(
    clientId: string,
    message: { type: string; [key: string]: unknown }
  ) {
    // Handle different message types here if needed
    switch (message.type) {
      case "ping":
        this.sendToClient(clientId, {
          type: "pong",
          data: { timestamp: Date.now() },
        });
        break;
      default:
        // Unknown message type - ignore
        break;
    }
  }

  private sendToClient(
    clientId: string,
    message: { type: string; data: unknown }
  ) {
    const client = this.clients.get(clientId);
    /* istanbul ignore next -- @preserve */
    if (client && client.ws.readyState === WebSocket.OPEN) {
      // Rate limiting per client (less aggressive for critical events)
      const now = Date.now();
      const isCriticalMessage =
        (message.type === "status_update" &&
          (message.data as StatusEvent["data"])?.status === "COMPLETED") ||
        (message.data as StatusEvent["data"])?.status === "FAILED";

      if (
        !isCriticalMessage &&
        now - client.lastMessageTime < this.RATE_LIMIT_MS
      ) {
        return; // Skip this message due to rate limiting
      }

      try {
        client.ws.send(JSON.stringify(message));
        client.lastMessageTime = now;
      } catch (error) {
        /* istanbul ignore next -- @preserve */
        console.error(
          `❌ WebSocket: Failed to send message to ${clientId}:`,
          error
        );
        this.clients.delete(clientId);
      }
    }
  }

  private scheduleBatch() {
    if (this.batchTimeout) {
      return; // Already scheduled
    }

    this.batchTimeout = setTimeout(() => {
      this.flushBatch();
    }, this.BATCH_INTERVAL_MS);
  }

  private flushBatch() {
    if (this.pendingEvents.length === 0) {
      this.batchTimeout = null;
      return;
    }

    // Create batches of events
    const batches: StatusEvent["data"][] = [];
    while (this.pendingEvents.length > 0) {
      const batch = this.pendingEvents.splice(0, this.MAX_BATCH_SIZE);
      batches.push(...batch);
    }

    // Send batched message
    const batchId = `batch_${++this.lastBatchId}_${Date.now()}`;
    const optimizedEvents = batches.map((event) => this.optimizeEvent(event));
    const batchedMessage: BatchedStatusEvent = {
      type: "status_update_batch",
      data: {
        events: optimizedEvents,
        batchId,
        timestamp: new Date(),
      },
    };

    console.log(
      `[WebSocket] Broadcasting batched status events to ${this.clients.size} clients:`,
      `${batches.length} events in batch ${batchId}`
    );

    this.broadcastMessage(batchedMessage);
    this.batchTimeout = null;
  }

  private broadcastMessage(
    message: StatusEvent | OptimizedStatusEvent | BatchedStatusEvent
  ) {
    const messageStr = JSON.stringify(message);

    if (this.clients.size === 0) {
      console.log("[WebSocket] No clients connected to receive the broadcast");
      return;
    }

    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(messageStr);
        } catch (error) {
          /* istanbul ignore next -- @preserve */
          console.error(
            `❌ WebSocket: Failed to broadcast to ${clientId}:`,
            error
          );
          this.clients.delete(clientId);
        }
      } else {
        // Remove disconnected clients
        this.clients.delete(clientId);
        /* istanbul ignore next -- @preserve */
        console.log(`[WebSocket] Removed disconnected client ${clientId}`);
      }
    }
  }

  public broadcastStatusEvent(event: StatusEvent["data"]) {
    // Debug logging for completion events
    if (event.status === "COMPLETED" || event.status === "FAILED") {
      console.log(
        `📡 [WebSocket] Broadcasting ${event.status}: ${event.importId} - ${event.context || "no-context"} (${this.clients.size} clients)`
      );
    }

    // For immediate critical updates (errors, completions, progress), send immediately
    const isCriticalEvent =
      event.status === "FAILED" ||
      event.status === "COMPLETED" ||
      event.context?.includes("progress") ||
      event.context?.includes("processing");

    if (isCriticalEvent) {
      const optimizedEvent = this.optimizeEvent(event);
      const immediateMessage: OptimizedStatusEvent = {
        type: "status_update",
        data: optimizedEvent,
      };
      this.broadcastMessage(immediateMessage);
    } else {
      // Add non-critical events to pending batch
      this.pendingEvents.push(event);
      // Schedule batch flush if not already scheduled
      this.scheduleBatch();
    }
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  public close() {
    // Flush any pending events before closing
    if (this.pendingEvents.length > 0) {
      this.flushBatch();
    }

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.wss.close();
    console.log("🔌 WebSocket: Server closed");
  }
}

// Create singleton instance
let wsManager: WebSocketManager | null = null;

export function initializeWebSocketServer(port?: number): WebSocketManager {
  if (!wsManager) {
    try {
      /* istanbul ignore next -- @preserve */
      console.log(`🔌 WebSocket: Initializing server on port ${port || 8080}`);
      wsManager = new WebSocketManager(port);
      console.log(`🔌 WebSocket: Server initialized successfully`);
    } catch (error) {
      /* istanbul ignore next -- @preserve */
      console.error(`❌ WebSocket: Failed to initialize server:`, error);
      /* istanbul ignore next -- @preserve */
      throw error;
    }
  }
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager | null {
  return wsManager;
}

export function broadcastStatusEvent(event: StatusEvent["data"]) {
  const manager = getWebSocketManager();

  if (manager) {
    manager.broadcastStatusEvent(event);
  } else {
    console.warn(
      `⚠️ WebSocket: Manager not initialized, cannot broadcast event: ${event.status} - ${event.importId}`
    );

    // For critical events, try to initialize the manager
    if (event.status === "COMPLETED" || event.status === "FAILED") {
      console.warn(
        `⚠️ WebSocket: Attempting to initialize manager for critical event`
      );
      try {
        const newManager = initializeWebSocketServer();
        if (newManager) {
          newManager.broadcastStatusEvent(event);
          console.log(
            `✅ WebSocket: Successfully broadcast critical event after initialization`
          );
        }
      } catch (error) {
        console.error(
          `❌ WebSocket: Failed to initialize manager for critical event:`,
          error
        );
      }
    }
  }
}
