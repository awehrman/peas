import { ConceptEditingMutation } from "./concept-editing";
import { CorpusHealthQuery } from "./corpus-health";
import { GrammarLoopMutation, GrammarLoopQuery } from "./grammar-loop";
import { IngredientMutation, IngredientQuery } from "./ingredients";
import { Mutation } from "./mutation";
import { Query } from "./query";
import { TeachMutation, TeachQuery, teachTypeResolvers } from "./teach";

import type { Resolvers } from "../generated/resolvers-types";

export const resolvers: Resolvers = {
  Query: {
    ...Query,
    ...TeachQuery,
    ...CorpusHealthQuery,
    ...GrammarLoopQuery,
    ...IngredientQuery,
  },
  Mutation: {
    ...Mutation,
    ...TeachMutation,
    ...ConceptEditingMutation,
    ...IngredientMutation,
    ...GrammarLoopMutation,
  },
  ...teachTypeResolvers,
  MutationPayload: {
    __resolveType: (payload) => payload.__typename ?? "BasicPayload",
  },
};
