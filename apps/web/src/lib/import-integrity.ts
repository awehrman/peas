import {
  AddCategoryToNoteDocument,
  ApproveCategoryDocument,
  ExcludeCategoryDocument,
  PreviewCategoryRuleDocument,
  PreviewDuplicateResolutionDocument,
  RecheckUrlDocument,
  RemoveCategoryDocument,
  RestoreCategoryDocument,
} from "~/graphql/generated";
import { useMutationAction } from "~/lib/apollo/cache-coordinator-provider";

import { useCallback } from "react";

import { useApolloClient } from "@apollo/client/react";
import type {
  CategoryActions,
  CategoryRulePreview,
  DuplicateResolution,
  DuplicateResolutionPreview,
  FoodRelationshipType,
} from "@peas/features";

/**
 * Accept, reject, restore, remove, and add actions for one note's categories. Each mutation's effect refetches the note and recipe views.
 *
 * @example
 * const categoryActions = useCategoryActions(note.id);
 * <NoteDetailPageContent note={note} {...categoryActions} />
 */
export function useCategoryActions(noteId: string): Required<CategoryActions> {
  const onApproveCategory = useMutationAction(ApproveCategoryDocument, {
    variables: (categoryId: string) => ({ noteId, categoryId }),
    payload: (result) => result.approveCategory,
  });
  const onExcludeCategory = useMutationAction(ExcludeCategoryDocument, {
    variables: (categoryId: string) => ({ noteId, categoryId }),
    payload: (result) => result.excludeCategory,
  });
  const onRestoreCategory = useMutationAction(RestoreCategoryDocument, {
    variables: (categoryId: string) => ({ noteId, categoryId }),
    payload: (result) => result.restoreCategory,
  });
  const onRemoveCategory = useMutationAction(RemoveCategoryDocument, {
    variables: (categoryId: string) => ({ noteId, categoryId }),
    payload: (result) => result.removeCategory,
  });
  const onAddCategory = useMutationAction(AddCategoryToNoteDocument, {
    variables: (categoryName: string) => ({ noteId, categoryName, categoryId: null }),
    payload: (result) => result.addCategoryToNote,
  });
  return { onApproveCategory, onExcludeCategory, onRestoreCategory, onRemoveCategory, onAddCategory };
}

/** Queues a reachability check; the result shows after the next refetch. */
export function useRecheckUrl() {
  return useMutationAction(RecheckUrlDocument, {
    variables: (urlId: string) => ({ urlId }),
    payload: (result) => result.recheckUrl,
  });
}

/** What a duplicate decision would do; never cached, since every option change asks again. */
export function useDuplicatePreview(candidateId: string) {
  const client = useApolloClient();
  return useCallback(
    async (input: DuplicateResolution): Promise<DuplicateResolutionPreview> => {
      const { data, error } = await client.query({
        query: PreviewDuplicateResolutionDocument,
        variables: { id: candidateId, input },
        fetchPolicy: "no-cache",
      });
      if (!data) throw error ?? new Error("Could not preview this decision");
      return data.previewDuplicateResolution;
    },
    [client, candidateId]
  );
}

/** How many notes a category rule would include, before saving it. */
export function useCategoryRulePreview() {
  const client = useApolloClient();
  return useCallback(
    async (conceptId: string, traversal: FoodRelationshipType[]): Promise<CategoryRulePreview> => {
      const { data, error } = await client.query({
        query: PreviewCategoryRuleDocument,
        variables: { conceptId, traversal },
        fetchPolicy: "no-cache",
      });
      if (!data) throw error ?? new Error("Could not preview this rule");
      return data.previewCategoryRule;
    },
    [client]
  );
}
