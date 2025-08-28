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
  private readonly HEARTBEAT_INTERVAL_MS =
    WEBSOCKET_CONSTANTS.HEARTBEAT_INTERVAL_MS;
  private readonly CONNECTION_TIMEOUT_MS =
    WEBSOCKET_CONSTANTS.CONNECTION_TIMEOUT_MS;

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
        const d = message.data as StatusEvent["data"]; // narrow
        // Debug when rate-limiting PROCESSING progress events
        if (
          d?.context &&
          (d.context === "ingredient_processing" ||
            d.context === "instruction_processing") &&
          d.status === "PROCESSING"
        ) {
          console.log(
            `⏱️ [WebSocket] Rate-limited progress message ${d.currentCount ?? "-"}/${d.totalCount ?? "-"} for ${d.context} (importId=${d.importId})`
          );
        }
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

  public broadcastStatusEvent(event: StatusEvent["data"]) {
    // Debug logging for completion events
    if (event.status === "COMPLETED" || event.status === "FAILED") {
      console.log(
        `📡 [WebSocket] Broadcasting ${event.status}: ${event.importId} - ${event.context || "no-context"} (${this.clients.size} clients)`
      );
    }

    // Debug logging for clean_html events
    if (
      event.context === "clean_html_start" ||
      event.context === "clean_html_end"
    ) {
      console.log(
        `🧹 [WebSocket] Broadcasting clean_html event: ${event.status} - ${event.importId} - ${event.context} (${this.clients.size} clients)`
      );
    }

    // Send all events immediately - the status broadcaster handles deduplication
    const message: StatusEvent = {
      type: "status_update",
      data: event,
    };
    this.broadcastMessage(message);
  }

  private broadcastMessage(message: StatusEvent) {
    const messageStr = JSON.stringify(message);

    if (this.clients.size === 0) {
      console.log("[WebSocket] No clients connected to receive the broadcast");
      return;
    }

    let successfulDeliveries = 0;
    let failedDeliveries = 0;
    let disconnectedClients = 0;

    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(messageStr);
          successfulDeliveries++;

          // Update last message time for health monitoring
          client.lastMessageTime = Date.now();
        } catch (error) {
          /* istanbul ignore next -- @preserve */
          console.error(
            `❌ WebSocket: Failed to broadcast to ${clientId}:`,
            error
          );
          this.clients.delete(clientId);
          failedDeliveries++;
        }
      } else {
        // Remove disconnected clients
        this.clients.delete(clientId);
        /* istanbul ignore next -- @preserve */
        console.log(`[WebSocket] Removed disconnected client ${clientId}`);
        disconnectedClients++;
      }
    }

    // Log delivery statistics for important events
    if (
      message.data.status === "COMPLETED" ||
      message.data.status === "FAILED"
    ) {
      console.log(
        `📊 [WebSocket] Event delivery stats: ${successfulDeliveries} successful, ${failedDeliveries} failed, ${disconnectedClients} disconnected`
      );
    }
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  public close() {
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
