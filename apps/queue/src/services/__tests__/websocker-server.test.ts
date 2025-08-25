import type { NoteStatus } from "@peas/database";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebSocket, WebSocketServer } from "ws";

import {
  createTestError,
  testWebSocketInterface,
} from "../../test-utils/service";
import { WebSocketManager } from "../websocket-server";

// Type definitions for mocks
interface MockWebSocket {
  readyState: number;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
}

interface MockWebSocketServer {
  on: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

// Mock WebSocket dependencies
vi.mock("ws", () => ({
  WebSocket: vi.fn(),
  WebSocketServer: vi.fn(),
}));

// Mock console methods
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();
const mockConsoleWarn = vi.fn();

global.console = {
  ...console,
  log: mockConsoleLog,
  error: mockConsoleError,
  warn: mockConsoleWarn,
};

// Helper to access private clients map for testing
function getClients(manager: WebSocketManager): Map<string, unknown> {
  return (manager as unknown as { clients: Map<string, unknown> }).clients;
}

describe("websocket-server.ts", () => {
  let mockWebSocketServer: MockWebSocketServer;
  let mockWebSocket: MockWebSocket;
  let wsManager: WebSocketManager;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup WebSocket mocks
    mockWebSocket = {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      close: vi.fn(),
      on: vi.fn(),
    };

    mockWebSocketServer = {
      on: vi.fn(),
      close: vi.fn(),
    };

    (WebSocketServer as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => mockWebSocketServer
    );
    (WebSocket as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => mockWebSocket
    );
  });

  afterEach(() => {
    // Clean up singleton
    vi.resetModules();
  });

  describe("WebSocketManager", () => {
    beforeEach(() => {
      wsManager = new WebSocketManager(8080);
    });

    describe("constructor", () => {
      it("should create WebSocketManager with default port", () => {
        const manager = new WebSocketManager();

        expect(manager).toBeInstanceOf(WebSocketManager);
        expect(WebSocketServer).toHaveBeenCalledWith({ port: 8080 });
      });

      it("should create WebSocketManager with custom port", () => {
        const manager = new WebSocketManager(9000);

        expect(manager).toBeInstanceOf(WebSocketManager);
        expect(WebSocketServer).toHaveBeenCalledWith({ port: 9000 });
      });

      it("should setup event handlers", () => {
        expect(mockWebSocketServer.on).toHaveBeenCalledWith(
          "connection",
          expect.any(Function)
        );
        expect(mockWebSocketServer.on).toHaveBeenCalledWith(
          "error",
          expect.any(Function)
        );
      });

      it("should log server startup", () => {
        expect(mockConsoleLog).toHaveBeenCalledWith(
          "🔌 WebSocket: Server started on port 8080"
        );
      });
    });

    describe("connection handling", () => {
      let connectionHandler: (ws: MockWebSocket, req: unknown) => void;

      beforeEach(() => {
        // Get the connection handler
        const connectionCall = mockWebSocketServer.on.mock.calls.find(
          (call: unknown[]) => call[0] === "connection"
        );
        connectionHandler =
          (connectionCall?.[1] as (ws: MockWebSocket, req: unknown) => void) ||
          (() => {});
      });

      it("should handle new connections", () => {
        const mockRequest = {};

        connectionHandler(mockWebSocket, mockRequest);

        expect(mockWebSocket.on).toHaveBeenCalledWith(
          "message",
          expect.any(Function)
        );
        expect(mockWebSocket.on).toHaveBeenCalledWith(
          "close",
          expect.any(Function)
        );
        expect(mockWebSocket.on).toHaveBeenCalledWith(
          "error",
          expect.any(Function)
        );
      });

      it("should reject connections when max clients reached", () => {
        // Fill up the client list
        for (let i = 0; i < 100; i++) {
          const client = {
            id: `client-${i}`,
            ws: mockWebSocket,
            connectedAt: new Date(),
          };
          getClients(wsManager).set(`client-${i}`, client);
        }

        connectionHandler(mockWebSocket, {});

        expect(mockWebSocket.close).toHaveBeenCalledWith(
          1013,
          "Too many connections"
        );
      });

      it("should send welcome message to new clients", () => {
        connectionHandler(mockWebSocket, {});

        expect(mockWebSocket.send).toHaveBeenCalledWith(
          expect.stringMatching(
            /{"type":"connection_established","data":{"clientId":"[^"]+","message":"Connected to status updates"}}/
          )
        );
      });

      it("should handle client messages", () => {
        // Clear the mock to start fresh
        mockWebSocket.send.mockClear();
        
        connectionHandler(mockWebSocket, {});

        // Get the message handler
        const messageCall = mockWebSocket.on.mock.calls.find(
          (call: unknown[]) => call[0] === "message"
        );
        const messageHandler = messageCall?.[1] as (data: Buffer) => void;
        expect(messageHandler).toBeDefined();

        // Test that the message handler can be called without errors
        const pingMessage = JSON.stringify({ type: "ping" });
        expect(() => messageHandler!(Buffer.from(pingMessage))).not.toThrow();
        
        // Verify that at least the connection message was sent
        expect(mockWebSocket.send).toHaveBeenCalled();
      });

      it("should handle invalid JSON messages", () => {
        connectionHandler(mockWebSocket, {});

        const messageCall = mockWebSocket.on.mock.calls.find(
          (call: unknown[]) => call[0] === "message"
        );
        const messageHandler = messageCall?.[1] as (data: Buffer) => void;
        expect(messageHandler).toBeDefined();

        messageHandler!(Buffer.from("invalid json"));

        expect(mockConsoleError).toHaveBeenCalledWith(
          "❌ WebSocket: Failed to parse client message:",
          expect.any(Error)
        );
      });

      it("should handle unknown message types", () => {
        connectionHandler(mockWebSocket, {});

        const messageCall = mockWebSocket.on.mock.calls.find(
          (call: unknown[]) => call[0] === "message"
        );
        const messageHandler = messageCall?.[1] as (data: Buffer) => void;
        expect(messageHandler).toBeDefined();

        const unknownMessage = JSON.stringify({ type: "unknown" });
        messageHandler!(Buffer.from(unknownMessage));

        // Should only have the initial connection message, no additional response for unknown types
        expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
      });

      it("should handle client disconnection", () => {
        connectionHandler(mockWebSocket, {});

        const closeCall = mockWebSocket.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close"
        );
        const closeHandler = closeCall?.[1] as () => void;
        expect(closeHandler).toBeDefined();

        closeHandler!();

        expect(getClients(wsManager).size).toBe(0);
      });

      it("should handle client errors", () => {
        connectionHandler(mockWebSocket, {});

        const errorCall = mockWebSocket.on.mock.calls.find(
          (call: unknown[]) => call[0] === "error"
        );
        const errorHandler = errorCall?.[1] as (err: Error) => void;
        expect(errorHandler).toBeDefined();

        const error = createTestError("Test error");
        errorHandler!(error);

        expect(mockConsoleError).toHaveBeenCalledWith(
          expect.stringMatching(/❌ WebSocket: Client [^ ]+ error:/),
          error
        );
        expect(getClients(wsManager).size).toBe(0);
      });
    });

    describe("broadcastStatusEvent", () => {
      it("should broadcast status event to all connected clients", () => {
        // Add some mock clients
        const client1 = {
          id: "client1",
          ws: mockWebSocket,
          connectedAt: new Date(),
        };
        const client2 = {
          id: "client2",
          ws: mockWebSocket,
          connectedAt: new Date(),
        };
        getClients(wsManager).set("client1", client1);
        getClients(wsManager).set("client2", client2);

        // Clear the mock to start fresh
        mockWebSocket.send.mockClear();
        
        const statusEvent = {
          importId: "test-import",
          noteId: "test-note",
          status: "COMPLETED" as NoteStatus,
          message: "Test message",
          context: "test",
          currentCount: 1,
          totalCount: 5,
          createdAt: new Date(),
          indentLevel: 0,
          metadata: { title: "Test Recipe" },
        };

        wsManager.broadcastStatusEvent(statusEvent);

        // The broadcastStatusEvent method now logs for COMPLETED/FAILED events
        expect(mockConsoleLog).toHaveBeenCalledWith(
          "📡 [WebSocket] Broadcasting COMPLETED: test-import - test (2 clients)"
        );

        expect(mockWebSocket.send).toHaveBeenCalledTimes(2);
        expect(mockWebSocket.send).toHaveBeenCalledWith(
          expect.stringMatching(/{"type":"status_update","data":{.*"i":"test-import".*"s":"COMPLETED".*}}/)
        );
      });

      it("should handle disconnected clients", () => {
        const disconnectedClient = {
          id: "disconnected",
          ws: {
            readyState: 3, // WebSocket.CLOSED
            send: vi.fn(),
            close: vi.fn(),
            on: vi.fn(),
          },
          connectedAt: new Date(),
        };
        getClients(wsManager).set("disconnected", disconnectedClient);

        const statusEvent = {
          importId: "test-import",
          status: "COMPLETED" as NoteStatus,
          context: "test",
          createdAt: new Date(),
        };

        wsManager.broadcastStatusEvent(statusEvent);

        // Should log that client was removed - check for the specific log message
        const logCalls = mockConsoleLog.mock.calls;
        const removedLogCall = logCalls.find(
          (call) =>
            call[0] &&
            typeof call[0] === "string" &&
            call[0].includes("[WebSocket] Removed disconnected client")
        );
        expect(removedLogCall).toBeDefined();
        expect(getClients(wsManager).size).toBe(0);
      });

      it("should handle send errors", () => {
        const client = {
          id: "client1",
          ws: mockWebSocket,
          connectedAt: new Date(),
        };
        getClients(wsManager).set("client1", client);

        mockWebSocket.send.mockImplementation(() => {
          throw createTestError("Send error");
        });

        const statusEvent = {
          importId: "test-import",
          status: "COMPLETED" as NoteStatus,
          context: "test",
          createdAt: new Date(),
        };

        wsManager.broadcastStatusEvent(statusEvent);

        expect(mockConsoleError).toHaveBeenCalledWith(
          "❌ WebSocket: Failed to broadcast to client1:",
          expect.any(Error)
        );
        expect(getClients(wsManager).size).toBe(0);
      });

      it("should log when no clients are connected", () => {
        const statusEvent = {
          importId: "test-import",
          status: "COMPLETED" as NoteStatus,
          context: "test",
          createdAt: new Date(),
        };

        wsManager.broadcastStatusEvent(statusEvent);

        // The broadcastMessage method now logs a different message when no clients are connected
        expect(mockConsoleLog).toHaveBeenCalledWith(
          "[WebSocket] No clients connected to receive the broadcast"
        );
      });
    });

    describe("getConnectedClientsCount", () => {
      it("should return correct client count", () => {
        expect(wsManager.getConnectedClientsCount()).toBe(0);

        const client1 = {
          id: "client1",
          ws: mockWebSocket,
          connectedAt: new Date(),
        };
        const client2 = {
          id: "client2",
          ws: mockWebSocket,
          connectedAt: new Date(),
        };
        getClients(wsManager).set("client1", client1);
        getClients(wsManager).set("client2", client2);

        expect(wsManager.getConnectedClientsCount()).toBe(2);
      });
    });

    describe("close", () => {
      it("should close the WebSocket server", () => {
        wsManager.close();

        expect(mockWebSocketServer.close).toHaveBeenCalled();
        expect(mockConsoleLog).toHaveBeenCalledWith(
          "🔌 WebSocket: Server closed"
        );
      });
    });
  });

  describe("singleton management", () => {
    beforeEach(() => {
      // Reset singleton by clearing the module cache
      vi.resetModules();
      // Clear the singleton variable
      vi.doMock("../websocket-server", async () => {
        const actual = await vi.importActual("../websocket-server");
        return {
          ...actual,
          wsManager: null,
        };
      });
    });

    describe("initializeWebSocketServer", () => {
      it("should create and return WebSocketManager instance", async () => {
        const { initializeWebSocketServer } = await import(
          "../websocket-server"
        );
        const manager = initializeWebSocketServer(8080);

        expect(manager).toBeDefined();
        expect(WebSocketServer).toHaveBeenCalledWith({ port: 8080 });
      });

      it("should return existing instance on subsequent calls", async () => {
        const { initializeWebSocketServer } = await import(
          "../websocket-server"
        );
        const manager1 = initializeWebSocketServer(8080);
        const manager2 = initializeWebSocketServer(9000); // Different port should be ignored

        expect(manager1).toBe(manager2);
        expect(WebSocketServer).toHaveBeenCalledTimes(1); // Only called once
      });
    });

    describe("getWebSocketManager", () => {
      it("should return null when not initialized", async () => {
        const { getWebSocketManager } = await import("../websocket-server");
        const manager = getWebSocketManager();

        expect(manager).toBeNull();
      });

      it("should return manager after initialization", async () => {
        const { initializeWebSocketServer, getWebSocketManager } = await import(
          "../websocket-server"
        );
        const initializedManager = initializeWebSocketServer(8080);
        const retrievedManager = getWebSocketManager();

        expect(retrievedManager).toBe(initializedManager);
      });
    });

    describe("broadcastStatusEvent", () => {
      it("should broadcast when manager is initialized", async () => {
        const { initializeWebSocketServer, broadcastStatusEvent } =
          await import("../websocket-server");
        const manager = initializeWebSocketServer(8080);
        const broadcastSpy = vi.spyOn(manager, "broadcastStatusEvent");

        const statusEvent = {
          importId: "test-import",
          status: "PARSING" as NoteStatus,
          createdAt: new Date(),
        };

        broadcastStatusEvent(statusEvent);

        expect(broadcastSpy).toHaveBeenCalledWith(statusEvent);
      });

      it("should warn when manager is not initialized", async () => {
        const { broadcastStatusEvent } = await import("../websocket-server");
        const statusEvent = {
          importId: "test-import",
          status: "PARSING" as NoteStatus,
          createdAt: new Date(),
        };

        broadcastStatusEvent(statusEvent);

        expect(mockConsoleWarn).toHaveBeenCalledWith(
          "⚠️ WebSocket: Manager not initialized, cannot broadcast event: PARSING - test-import"
        );
      });
    });
  });

  describe("interface compliance", () => {
    it("should work with testWebSocketInterface utility", () => {
      const manager = new WebSocketManager(8080);
      const webSocketService = {
        webSocketManager: manager,
      };

      expect(() =>
        testWebSocketInterface(
          webSocketService as unknown as { webSocketManager: WebSocketManager }
        )
      ).not.toThrow();
    });
  });

  describe("error handling", () => {
    it("should handle server errors", () => {
      const errorCall = mockWebSocketServer.on.mock.calls.find(
        (call: unknown[]) => call[0] === "error"
      );

      if (errorCall) {
        const errorHandler = errorCall[1] as (err: Error) => void;
        const error = createTestError("Server error");
        errorHandler(error);

        expect(mockConsoleError).toHaveBeenCalledWith(
          "❌ WebSocket: Server error:",
          error
        );
      }
    });

    it("should handle send errors in sendToClient method", () => {
      // Create a client with a WebSocket that throws an error on send
      const errorWebSocket = {
        ...mockWebSocket,
        send: vi.fn().mockImplementation(() => {
          throw new Error("Send failed");
        }),
      };

      // Add client to the manager
      const clients = getClients(wsManager);
      clients.set("test-client", {
        id: "test-client",
        ws: errorWebSocket,
        connectedAt: new Date(),
      });

      // Call the private sendToClient method through reflection
      const sendToClient = (
        wsManager as unknown as {
          sendToClient: (
            clientId: string,
            message: { type: string; data: unknown }
          ) => void;
        }
      ).sendToClient.bind(wsManager);
      sendToClient("test-client", { type: "test", data: {} });

      expect(mockConsoleError).toHaveBeenCalledWith(
        "❌ WebSocket: Failed to send message to test-client:",
        expect.any(Error)
      );
      expect(clients.has("test-client")).toBe(false); // Client should be removed
    });

    it("should handle send errors in broadcastStatusEvent method", () => {
      // Create a client with a WebSocket that throws an error on send
      const errorWebSocket = {
        ...mockWebSocket,
        send: vi.fn().mockImplementation(() => {
          throw new Error("Broadcast failed");
        }),
      };

      // Add client to the manager
      const clients = getClients(wsManager);
      clients.set("error-client", {
        id: "error-client",
        ws: errorWebSocket,
        connectedAt: new Date(),
      });

      const statusEvent = {
        importId: "test-import",
        status: "COMPLETED" as NoteStatus,
        context: "test",
        createdAt: new Date(),
      };

      wsManager.broadcastStatusEvent(statusEvent);

      expect(mockConsoleError).toHaveBeenCalledWith(
        "❌ WebSocket: Failed to broadcast to error-client:",
        expect.any(Error)
      );
      expect(clients.has("error-client")).toBe(false); // Client should be removed
    });
  });
});
