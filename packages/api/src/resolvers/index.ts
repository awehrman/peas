import { ConceptEditingMutation } from "./concept-editing";
import { CorpusHealthQuery } from "./corpus-health";
import { ExplorerQuery, explorerTypeResolvers } from "./explorer";
import { GrammarLoopMutation, GrammarLoopQuery } from "./grammar-loop";
import { ImportIntegrityMutation, ImportIntegrityQuery } from "./import-integrity";
import {
  LexiconExplorerQuery,
  lexiconExplorerTypeResolvers,
} from "./lexicon-explorer";
import { IngredientMutation, IngredientQuery } from "./ingredients";
import { Mutation } from "./mutation";
import { Query } from "./query";
import { StructureMutation, StructureQuery } from "./structure";
import { TeachMutation, TeachQuery, teachTypeResolvers } from "./teach";

import type { Resolvers } from "../generated/resolvers-types";

export const resolvers: Resolvers = {
  Query: {
    ...Query,
    ...TeachQuery,
    ...CorpusHealthQuery,
    ...ExplorerQuery,
    ...LexiconExplorerQuery,
    ...StructureQuery,
    ...GrammarLoopQuery,
    ...IngredientQuery,
    ...ImportIntegrityQuery,
  },
  Mutation: {
    ...Mutation,
    ...TeachMutation,
    ...ConceptEditingMutation,
    ...IngredientMutation,
    ...GrammarLoopMutation,
    ...ImportIntegrityMutation,
    ...StructureMutation,
  },
  ...teachTypeResolvers,
  ...explorerTypeResolvers,
  ...lexiconExplorerTypeResolvers,
  MutationPayload: {
    __resolveType: (payload) => payload.__typename ?? "BasicPayload",
  },
};
