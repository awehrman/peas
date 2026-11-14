import type { ApiContext } from "./context.js";

import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginLandingPageDisabled } from "@apollo/server/plugin/disabled";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";

import { SESSION_COOKIE_NAME, readCookie } from "./auth/session-cookie.js";
import { type AuthUser, validateSession } from "./auth/session.js";
import { createFetchHandler } from "./http/fetch-handler.js";
import { apiSchema } from "./schema/executable.js";

export interface ApiServerOptions {
  /** Enables introspection, stack traces in errors, and the Apollo Sandbox landing page. */
  development: boolean;
}

/**
 * The Peas GraphQL server. Settings are explicit rather than inferred from NODE_ENV.
 *
 * @example
 * const server = createApiServer({ development: process.env.NODE_ENV !== "production" });
 * const result = await server.executeOperation({ query: "{ viewer { id } }" }, { contextValue: { viewer: null } });
 */
export function createApiServer({
  development,
}: ApiServerOptions): ApolloServer<ApiContext> {
  return new ApolloServer<ApiContext>({
    schema: apiSchema,
    introspection: development,
    includeStacktraceInErrorResponses: development,
    plugins: [
      development
        ? ApolloServerPluginLandingPageLocalDefault({ footer: false })
        : ApolloServerPluginLandingPageDisabled(),
    ],
  });
}

/**
 * Resolves the signed-in user from the request's session cookie.
 *
 * @example
 * await resolveViewer(new Request("http://localhost/api/graphql", { headers: { cookie: "session=abc" } })) // AuthUser or null
 */
export async function resolveViewer(
  request: Request
): Promise<AuthUser | null> {
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  if (!token) return null;
  const { user } = await validateSession(token);
  return user;
}

let sharedHandler: ((request: Request) => Promise<Response>) | null = null;

/**
 * A Fetch handler for `/api/graphql`, created once per server process.
 *
 * @example
 * // apps/web/src/routes/api/graphql.ts
 * server: { handlers: { GET: ({ request }) => handleGraphQLRequest(request), POST: ({ request }) => handleGraphQLRequest(request) } }
 */
export function handleGraphQLRequest(request: Request): Promise<Response> {
  sharedHandler ??= createFetchHandler(
    createApiServer({ development: process.env.NODE_ENV !== "production" }),
    async (incoming) => ({ viewer: await resolveViewer(incoming) })
  );
  return sharedHandler(request);
}
