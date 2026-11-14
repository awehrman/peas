import { ApolloLink, CombinedGraphQLErrors, HttpLink } from "@apollo/client";
import { ErrorLink } from "@apollo/client/link/error";
import { SchemaLink } from "@apollo/client/link/schema";
import { apiSchema, resolveViewer } from "@peas/api";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const GRAPHQL_PATH = "/api/graphql";

/** Sends the browser to the login page when the session has expired mid-visit. */
const authErrorLink = new ErrorLink(({ error }) => {
  if (typeof window === "undefined") return;
  if (
    CombinedGraphQLErrors.is(error) &&
    error.errors.some(
      (graphQLError) => graphQLError.extensions?.code === "UNAUTHENTICATED"
    )
  ) {
    window.location.assign("/login");
  }
});

/**
 * Server rendering runs queries in-process against the same schema, with the viewer resolved from the incoming request's session cookie; the browser posts to /api/graphql.
 */
export const createGraphQLLink = createIsomorphicFn()
  .server(
    (): ApolloLink =>
      new SchemaLink({
        schema: apiSchema,
        context: async () => ({ viewer: await resolveViewer(getRequest()) }),
      })
  )
  .client((): ApolloLink =>
    ApolloLink.from([
      authErrorLink,
      new HttpLink({ uri: GRAPHQL_PATH, credentials: "same-origin" }),
    ])
  );
