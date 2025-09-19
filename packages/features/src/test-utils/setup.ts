import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

// Mock WebSocket globally
global.WebSocket = vi.fn(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  send: vi.fn(),
  readyState: 1, // OPEN
})) as any;

// Mock window.btoa for base64 encoding
global.btoa = vi.fn((str: string) =>
  Buffer.from(str, "binary").toString("base64")
);

// Mock window.atob for base64 decoding
global.atob = vi.fn((str: string) =>
  Buffer.from(str, "base64").toString("binary")
);

// Mock fetch globally
global.fetch = vi.fn();

// Mock File and FileList for file upload tests
global.File = vi.fn((fileBits, fileName, options) => ({
  name: fileName,
  size: fileBits[0]?.length || 0,
  type: options?.type || "",
  lastModified: Date.now(),
  arrayBuffer: vi.fn(),
  slice: vi.fn(),
  stream: vi.fn(),
  text: vi.fn(),
})) as any;

global.FileList = vi.fn(() => ({
  length: 0,
  item: vi.fn(),
  [Symbol.iterator]: vi.fn(),
})) as any;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => "mock-object-url");
global.URL.revokeObjectURL = vi.fn();

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn(
  (cb) => setTimeout(cb, 0) as unknown as number
);
global.cancelAnimationFrame = vi.fn();

// Cleanup after each test case
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Setup and teardown for test suites
beforeAll(() => {
  // Additional setup if needed
});

afterAll(() => {
  // Cleanup after all tests
});
