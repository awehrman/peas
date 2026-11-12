import type { Resolvers } from "../generated/resolvers-types";
import { Mutation } from "./mutation";
import { Query } from "./query";

export const resolvers: Resolvers = {
  Query,
  Mutation,
  MutationPayload: {
    __resolveType: (payload) => payload.__typename ?? "BasicPayload",
  },
};
