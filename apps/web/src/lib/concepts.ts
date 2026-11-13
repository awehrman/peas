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
  SubstitutionInput,
} from "@peas/features";

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
