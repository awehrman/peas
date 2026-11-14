import { cacheConfig } from "./cache-config";

import { disableFragmentWarnings } from "@apollo/client";
import { InMemoryCache } from "@apollo/client-integration-tanstack-start";

// Streaming SSR re-parses preloaded queries with gql, and graphql-tag then reports shared codegen fragments as duplicates. Codegen already guarantees fragment names are unique.
disableFragmentWarnings();

/**
 * The per-request cache. The integration's InMemoryCache adds streaming SSR hydration on top of Apollo's.
 *
 * @example
 * const cache = createCache();
 * cache.identify({ __typename: "Recipe", id: "r1" }) // "Recipe:r1"
 */
export function createCache(): InMemoryCache {
  return new InMemoryCache(cacheConfig);
}
