import { vi } from "vitest";

import type {
  StatusEvent,
  WebSocketMessage,
} from "../../import/types/import-types";

// Mock WebSocket class
export class MockWebSocket {
  public readyState: number = 1; // OPEN
  public url: string;
  public protocol: string = "";
  public extensions: string = "";
  public bufferedAmount: number = 0;
  public binaryType: BinaryType = "blob";

  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;

  public readonly CONNECTING = 0;
  public readonly OPEN = 1;
  public readonly CLOSING = 2;
  public readonly CLOSED = 3;

  private eventListeners: Map<string, Function[]> = new Map();

  constructor(url: string) {
    this.url = url;
  }

  public addEventListener = vi.fn((type: string, listener: Function) => {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(listener);
  });

  public removeEventListener = vi.fn((type: string, listener: Function) => {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  });

  public close = vi.fn((code?: number, reason?: string) => {
    this.readyState = this.CLOSED;
    const closeEvent = new CloseEvent("close", { code, reason });
    this.onclose?.(closeEvent);
    this.dispatchEvent(closeEvent);
  });

  public send = vi.fn((data: string | ArrayBuffer | Blob | ArrayBufferView) => {
    // Mock send implementation
  });

  public dispatchEvent = vi.fn((event: Event) => {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => listener(event));
    }
    return true;
  });

  // Helper methods for testing
  public simulateOpen() {
    this.readyState = this.OPEN;
    const openEvent = new Event("open");
    this.onopen?.(openEvent);
    this.dispatchEvent(openEvent);
  }

  public simulateMessage(data: WebSocketMessage) {
    const messageEvent = new MessageEvent("message", {
      data: JSON.stringify(data),
    });
    this.onmessage?.(messageEvent);
    this.dispatchEvent(messageEvent);
  }

  public simulateError(error?: string) {
    this.readyState = this.CLOSED;
    const errorEvent = new Event("error");
    this.onerror?.(errorEvent);
    this.dispatchEvent(errorEvent);
  }

  public simulateClose(code = 1000, reason = "Normal closure") {
    this.close(code, reason);
  }
}

// Helper to create status update messages
export const createStatusUpdateMessage = (
  importId: string,
  status: StatusEvent["status"],
  progress = 0,
  message?: string
): WebSocketMessage => ({
  type: "status_update",
  data: {
    importId,
    status,
    progress,
    message,
  },
});

// Helper to create connection established message
export const createConnectionMessage = (): WebSocketMessage => ({
  type: "connection_established",
  data: { connected: true, timestamp: new Date().toISOString() },
});

// Helper to create error message
export const createErrorMessage = (error: string): WebSocketMessage => ({
  type: "error",
  data: { error, timestamp: new Date().toISOString() },
});

// Mock WebSocket constructor
export const mockWebSocketConstructor = vi.fn(
  (url: string) => new MockWebSocket(url)
);

// Setup WebSocket mock
export const setupWebSocketMock = () => {
  global.WebSocket = mockWebSocketConstructor as any;
  return mockWebSocketConstructor;
};

// Cleanup WebSocket mock
export const cleanupWebSocketMock = () => {
  vi.clearAllMocks();
};
