import typeDefs from "./schema.graphql?raw";

import { makeExecutableSchema } from "@graphql-tools/schema";
import type { GraphQLSchema } from "graphql";

import { resolvers } from "../resolvers/index.js";

/**
 * The executable schema shared by the HTTP endpoint and server-side rendering (Apollo's SchemaLink runs queries in-process with the request's viewer).
 *
 * @example
 * new SchemaLink({ schema: apiSchema, context: async () => ({ viewer }) })
 */
export const apiSchema: GraphQLSchema = makeExecutableSchema({
  typeDefs,
  resolvers,
});
