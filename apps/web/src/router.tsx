import { routeTree } from "./routeTree.gen";

import {
  ApolloClient,
  routerWithApolloClient,
} from "@apollo/client-integration-tanstack-start";
import { createRouter } from "@tanstack/react-router";

import {
  ErrorState,
  NotFoundState,
  PendingState,
} from "./components/route-states";
import { createCache } from "./lib/apollo/cache";
import { createGraphQLLink } from "./lib/apollo/links";

/** Called once per request on the server and once in the browser, so every request gets its own Apollo client and cache. */
export function getRouter() {
  const apolloClient = new ApolloClient({
    cache: createCache(),
    link: createGraphQLLink(),
    // Imports change notes and ingredients in the background, so every navigation shows cached data at once and refreshes it from the server.
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-and-network",
        nextFetchPolicy: "cache-first",
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { ...routerWithApolloClient.defaultContext },
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultPendingComponent: PendingState,
    defaultErrorComponent: ErrorState,
    defaultNotFoundComponent: NotFoundState,
  });

  return routerWithApolloClient(router, apolloClient);
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
