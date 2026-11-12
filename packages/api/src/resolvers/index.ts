import { Mutation } from "./mutation";
import { Query } from "./query";
import { TeachMutation, TeachQuery, teachTypeResolvers } from "./teach";

import type { Resolvers } from "../generated/resolvers-types";

export const resolvers: Resolvers = {
  Query: { ...Query, ...TeachQuery },
  Mutation: { ...Mutation, ...TeachMutation },
  ...teachTypeResolvers,
  MutationPayload: {
    __resolveType: (payload) => payload.__typename ?? "BasicPayload",
  },
};
