import {
  RemoveConceptClassificationDocument,
  RemoveConceptSubstitutionDocument,
  SetConceptClassificationDocument,
  SetConceptSubstitutionDocument,
  SetConceptTagsDocument,
} from "~/graphql/generated";
import { useMutationAction } from "~/lib/apollo/cache-coordinator-provider";

import type {
  ClassificationInput,
  ConceptEditActions,
  ConceptExplorerOptions,
  SubstitutionInput,
} from "@peas/features";

/**
 * Links to a concept's page or its occurrence list, carrying the explorer switches.
 *
 * @example
 * conceptHref("0193...", { includeMadeFrom: true, includeNeedsReview: false }) // "/concepts/0193...?madeFrom=1"
 * conceptHref("0193...", { includeMadeFrom: false, includeNeedsReview: true }, "usage") // "/concepts/0193.../usage?review=1"
 */
export function conceptHref(
  conceptId: string,
  { includeMadeFrom, includeNeedsReview }: ConceptExplorerOptions,
  page?: "usage"
): string {
  const params = new URLSearchParams();
  if (includeMadeFrom) params.set("madeFrom", "1");
  if (includeNeedsReview) params.set("review", "1");
  const query = params.toString();
  return `/concepts/${encodeURIComponent(conceptId)}${page ? `/${page}` : ""}${query ? `?${query}` : ""}`;
}

/**
 * The concept page's editing actions, bound to one concept. Every effect goes through the cache coordinator.
 *
 * @example
 * const actions = useConceptEditActions(concept.id);
 * <ConceptDetailPageContent concept={concept} {...actions} />
 */
export function useConceptEditActions(
  conceptId: string
): Required<ConceptEditActions> {
  const onSetClassification = useMutationAction(
    SetConceptClassificationDocument,
    {
      variables: (input: ClassificationInput) => ({
        input: { conceptId, ...input },
      }),
      payload: (data) => data.setConceptClassification,
    }
  );
  const onRemoveClassification = useMutationAction(
    RemoveConceptClassificationDocument,
    {
      variables: (key: string) => ({ conceptId, key }),
      payload: (data) => data.removeConceptClassification,
    }
  );
  const onSetTags = useMutationAction(SetConceptTagsDocument, {
    variables: (tags: string[]) => ({ conceptId, tags }),
    payload: (data) => data.setConceptTags,
  });
  const onSetSubstitution = useMutationAction(SetConceptSubstitutionDocument, {
    variables: (input: SubstitutionInput) => ({
      input: { conceptId, ...input },
    }),
    payload: (data) => data.setConceptSubstitution,
  });
  const onRemoveSubstitution = useMutationAction(
    RemoveConceptSubstitutionDocument,
    {
      variables: (substituteId: string) => ({ conceptId, substituteId }),
      payload: (data) => data.removeConceptSubstitution,
    }
  );

  return {
    onSetClassification,
    onRemoveClassification,
    onSetTags,
    onSetSubstitution,
    onRemoveSubstitution,
  };
}
