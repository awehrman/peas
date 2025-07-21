/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

import {
  IngredientService,
  IngredientServiceContainer,
} from "../../../ingredient";

describe("IngredientService (private) importIngredientParser", () => {
  let service: IngredientService;

  beforeEach(() => {
    const logger: { log: Mock } = { log: vi.fn() };
    const container: IngredientServiceContainer = { logger };
    service = new IngredientService(container);
  });

  function callImportParser(): Promise<any> {
    return (service as any).importIngredientParser();
  }

  it("resolves to a parser object with a parse function", async () => {
    // Mock the entire method
    const fakeParser = { parse: vi.fn() };
    vi.spyOn(service as any, "importIngredientParser").mockResolvedValue(
      fakeParser
    );

    // Call the mocked method
    const parser = await callImportParser();
    expect(parser).toBe(fakeParser);
    expect(typeof parser.parse).toBe("function");
  });

  it("propagates errors from import", async () => {
    // Mock the method to throw an error
    vi.spyOn(service as any, "importIngredientParser").mockRejectedValue(
      new Error("fail")
    );

    // Expect the method to reject
    await expect(callImportParser()).rejects.toThrow("fail");
  });
});
