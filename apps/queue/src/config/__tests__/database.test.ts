import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock PrismaClient and @peas/database
const disconnectMock = vi.fn();
class MockPrismaClient {
  $disconnect = disconnectMock;
}
vi.mock("@peas/database", () => ({
  PrismaClient: MockPrismaClient,
}));

// Clear mocks and require cache before each test
beforeEach(() => {
  vi.resetModules();
  disconnectMock.mockClear();
});

describe("database.ts", () => {
  it("should export a PrismaClient instance", async () => {
    const mod = await import("../database");
    expect(mod.prisma).toBeInstanceOf(MockPrismaClient);
  });

  it("should call $disconnect on beforeExit", async () => {
    const processOnSpy = vi.spyOn(process, "on");
    await import("../database");
    // Find the beforeExit handler
    const handlerCall = processOnSpy.mock.calls.find(
      ([event]) => event === "beforeExit"
    );
    expect(handlerCall).toBeDefined();
    const handler = handlerCall![1];
    await handler();
    expect(disconnectMock).toHaveBeenCalled();
    processOnSpy.mockRestore();
  });

  it("should call $disconnect and process.exit on SIGINT (not test env)", async () => {
    const processOnSpy = vi.spyOn(process, "on");
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    await import("../database");
    const handlerCall = processOnSpy.mock.calls.find(
      ([event]) => event === "SIGINT"
    );
    expect(handlerCall).toBeDefined();
    const handler = handlerCall![1];
    await handler();
    expect(disconnectMock).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
    process.env.NODE_ENV = oldEnv;
    processOnSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("should call $disconnect and process.exit on SIGTERM (not test env)", async () => {
    const processOnSpy = vi.spyOn(process, "on");
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    await import("../database");
    const handlerCall = processOnSpy.mock.calls.find(
      ([event]) => event === "SIGTERM"
    );
    expect(handlerCall).toBeDefined();
    const handler = handlerCall![1];
    await handler();
    expect(disconnectMock).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
    process.env.NODE_ENV = oldEnv;
    processOnSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("should not call process.exit in test env for SIGINT/SIGTERM", async () => {
    const processOnSpy = vi.spyOn(process, "on");
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";
    await import("../database");
    const sigintHandlerCall = processOnSpy.mock.calls.find(
      ([event]) => event === "SIGINT"
    );
    const sigtermHandlerCall = processOnSpy.mock.calls.find(
      ([event]) => event === "SIGTERM"
    );
    expect(sigintHandlerCall).toBeDefined();
    expect(sigtermHandlerCall).toBeDefined();
    const sigintHandler = sigintHandlerCall![1];
    const sigtermHandler = sigtermHandlerCall![1];
    await sigintHandler();
    await sigtermHandler();
    expect(disconnectMock).toHaveBeenCalledTimes(2);
    expect(exitSpy).not.toHaveBeenCalled();
    process.env.NODE_ENV = oldEnv;
    processOnSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
