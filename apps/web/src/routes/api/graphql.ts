import { handleGraphQLRequest } from "@peas/api";
import { createFileRoute } from "@tanstack/react-router";

/**
 * The GraphQL endpoint. Authentication comes from the session cookie; Apollo Server's CSRF prevention rejects simple cross-site requests (non-JSON POSTs and GETs without a preflight header).
 */
export const Route = createFileRoute("/api/graphql")({
  server: {
    handlers: {
      GET: ({ request }) => handleGraphQLRequest(request),
      POST: ({ request }) => handleGraphQLRequest(request),
    },
  },
});
