import { ApolloServer } from "@apollo/server";
import { afterAll, describe, expect, it } from "vitest";

import { createFetchHandler } from "../http/fetch-handler.js";

const server = new ApolloServer<{ name: string }>({
  typeDefs: "type Query { hello: String! }",
  resolvers: {
    Query: {
      hello: (_parent: unknown, _args: unknown, context: { name: string }) =>
        `hi ${context.name}`,
    },
  },
});
const handle = createFetchHandler(server, async (request) => ({
  name: request.headers.get("x-name") ?? "anon",
}));
const url = "http://localhost/api/graphql";

describe("createFetchHandler", () => {
  afterAll(() => server.stop());

  it("executes JSON POSTs, including content types with parameters", async () => {
    const response = await handle(
      new Request(url, {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8",
          "x-name": "allie",
        },
        body: JSON.stringify({ query: "{ hello }" }),
      })
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { hello: "hi allie" } });
  });

  it("blocks simple cross-site requests (CSRF prevention)", async () => {
    const getWithoutPreflight = await handle(
      new Request(`${url}?query=${encodeURIComponent("{ hello }")}`)
    );
    expect(getWithoutPreflight.status).toBe(400);

    const textPost = await handle(
      new Request(url, {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: '{"query":"{ hello }"}',
      })
    );
    expect(textPost.status).toBe(400);
  });

  it("allows GET queries that carry the preflight header", async () => {
    const response = await handle(
      new Request(`${url}?query=${encodeURIComponent("{ hello }")}`, {
        headers: { "apollo-require-preflight": "true" },
      })
    );
    expect(response.status).toBe(200);
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await handle(
      new Request(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json",
      })
    );
    expect(response.status).toBe(400);
  });
});
