import { vi } from "vitest";

import type {
  ActivityState,
  FileUploadItem,
  ImportStatsState,
  StatusEvent,
  UploadBatch,
  UploadState,
  WebSocketMessage,
  WsConnectionState,
} from "../import/types/import-types";

export const createMockFile = (overrides: Partial<File> = {}): File => {
  const mockFile = {
    name: "test-file.html",
    size: 1024,
    type: "text/html",
    lastModified: Date.now(),
    arrayBuffer: vi.fn(),
    slice: vi.fn(),
    stream: vi.fn(),
    text: vi.fn(),
    webkitRelativePath: "",
    ...overrides,
  } as File;

  return mockFile;
};

export const createMockFileUploadItem = (
  overrides: Partial<FileUploadItem> = {}
): FileUploadItem => ({
  id: "test-file-1",
  file: createMockFile(),
  status: "pending",
  progress: 0,
  ...overrides,
});

export const createMockUploadBatch = (
  overrides: Partial<UploadBatch> = {}
): UploadBatch => ({
  importId: "test-import-1",
  createdAt: new Date().toISOString(),
  numberOfFiles: 2,
  files: [
    createMockFileUploadItem({ id: "file-1" }),
    createMockFileUploadItem({ id: "file-2" }),
  ],
  ...overrides,
});

export const createMockUploadState = (
  overrides: Partial<UploadState> = {}
): UploadState => ({
  previousBatches: [],
  currentBatch: undefined,
  ...overrides,
});

export const createMockImportStatsState = (
  overrides: Partial<ImportStatsState> = {}
): ImportStatsState => ({
  numberOfNotes: 0,
  numberOfIngredients: 0,
  numberOfParsingErrors: 0,
  ...overrides,
});

export const createMockActivityState = (
  overrides: Partial<ActivityState> = {}
): ActivityState => ({
  currentPageIndex: 0,
  pageToCardIds: {},
  cardsById: {},
  ...overrides,
});

export const createMockWsConnectionState = (
  overrides: Partial<WsConnectionState> = {}
): WsConnectionState => ({
  status: "idle",
  lastSuccessfulConnectionAt: undefined,
  reconnectionAttempts: 0,
  ...overrides,
});

export const createMockStatusEvent = (
  overrides: Partial<StatusEvent> = {}
): StatusEvent => ({
  importId: "test-import-1",
  status: "processing_started",
  progress: 0,
  message: "Processing started",
  ...overrides,
});

export const createMockWebSocketMessage = (
  overrides: Partial<WebSocketMessage> = {}
): WebSocketMessage => ({
  type: "status_update",
  data: createMockStatusEvent(),
  ...overrides,
});

// File creation helpers for different scenarios
export const createHtmlFile = (name = "recipe.html"): File =>
  createMockFile({
    name,
    type: "text/html",
    size: 2048,
  });

export const createImageFile = (name = "image.jpg"): File =>
  createMockFile({
    name,
    type: "image/jpeg",
    size: 1024 * 50, // 50KB
  });

export const createInvalidFile = (name = "document.pdf"): File =>
  createMockFile({
    name,
    type: "application/pdf",
    size: 1024,
  });

export const createOversizedFile = (name = "large.html"): File =>
  createMockFile({
    name,
    type: "text/html",
    size: 1024 * 1024 * 100, // 100MB
  });

// Mock WebSocket for testing
export const createMockWebSocket = () => {
  const mockWs = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    close: vi.fn(),
    send: vi.fn(),
    readyState: 1, // OPEN
    url: "ws://localhost:3001",
    protocol: "",
    extensions: "",
    bufferedAmount: 0,
    binaryType: "blob" as BinaryType,
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null,
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
    dispatchEvent: vi.fn(),
  };

  return mockWs;
};

// Mock fetch response helpers
export const createMockFetchResponse = (
  data: unknown,
  status = 200,
  ok = true
): Response =>
  ({
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers(),
    redirected: false,
    type: "basic",
    url: "http://localhost:3000/api/upload",
    body: null,
    bodyUsed: false,
    clone: vi.fn(),
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
    bytes: vi.fn().mockResolvedValue(new Uint8Array()),
  }) as Response;

// Test data for different scenarios
export const testScenarios = {
  singleHtmlFile: [createHtmlFile()],
  htmlWithImages: [
    createHtmlFile("recipe.html"),
    createImageFile("image1.jpg"),
    createImageFile("image2.png"),
  ],
  invalidFiles: [createInvalidFile("doc.pdf"), createInvalidFile("sheet.xlsx")],
  mixedValidInvalid: [
    createHtmlFile("recipe.html"),
    createInvalidFile("doc.pdf"),
    createImageFile("image.jpg"),
  ],
  oversizedFiles: [createOversizedFile("huge.html")],
  emptyFileList: [],
};
