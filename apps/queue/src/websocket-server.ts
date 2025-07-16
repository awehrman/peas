import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";

import type { NoteStatus } from "@peas/database";

interface StatusEvent {
  type: "status_update";
  data: {
    noteId: string;
    status: NoteStatus;
    message?: string;
    context?: string;
    errorMessage?: string;
    currentCount?: number;
    totalCount?: number;
    createdAt: Date;
  };
}

interface Client {
  id: string;
  ws: WebSocket;
  connectedAt: Date;
}

class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, Client> = new Map();
  private port: number;
  private readonly MAX_CLIENTS = 100;
  private readonly RATE_LIMIT_MS = 1000;

  constructor(port: number = 8080) {
    this.port = port;
    this.wss = new WebSocketServer({ port });
    this.setupEventHandlers();
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

      ws.on("close", () => {
        this.clients.delete(clientId);
      });

      ws.on("error", (error: Error) => {
        console.error(`❌ WebSocket: Client ${clientId} error:`, error);
        this.clients.delete(clientId);
      });
    });

    this.wss.on("error", (error) => {
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
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(
          `❌ WebSocket: Failed to send message to ${clientId}:`,
          error
        );
        this.clients.delete(clientId);
      }
    }
  }

  public broadcastStatusEvent(event: StatusEvent["data"]) {
    const message: StatusEvent = {
      type: "status_update",
      data: event,
    };

    const messageStr = JSON.stringify(message);

    console.log(
      `[WebSocket] Broadcasting status event to ${this.clients.size} clients:`,
      message
    );

    if (this.clients.size === 0) {
      console.log("[WebSocket] No clients connected to receive the broadcast");
    }

    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(messageStr);
          console.log(`[WebSocket] Successfully sent to client ${clientId}`);
        } catch (error) {
          console.error(
            `❌ WebSocket: Failed to broadcast to ${clientId}:`,
            error
          );
          this.clients.delete(clientId);
        }
      } else {
        // Remove disconnected clients
        this.clients.delete(clientId);
        console.log(`[WebSocket] Removed disconnected client ${clientId}`);
      }
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
    wsManager = new WebSocketManager(port);
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
      "⚠️ WebSocket: Manager not initialized, cannot broadcast event"
    );
  }
}
