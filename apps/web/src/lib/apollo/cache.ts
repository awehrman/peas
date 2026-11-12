import { cacheConfig } from "./cache-config";

import { InMemoryCache } from "@apollo/client-integration-tanstack-start";

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
