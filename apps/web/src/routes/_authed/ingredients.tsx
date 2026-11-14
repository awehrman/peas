import {
  CreateIngredientDocument,
  IngredientDetailDocument,
  type IngredientDetailQuery,
  IngredientNameOwnerDocument,
  IngredientsPageDocument,
  SaveIngredientDocument,
  SearchIngredientsDocument,
} from "~/graphql/generated";
import { useMutationAction } from "~/lib/apollo/cache-coordinator-provider";
import { optionalEnum, optionalText } from "~/lib/search";

import {
  type ComponentProps,
  type RefObject,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { QueryRef } from "@apollo/client/react";
import { useApolloClient, useReadQuery } from "@apollo/client/react";
import { Spinner } from "@peas/components";
import {
  INGREDIENT_GROUPINGS,
  INGREDIENT_VIEWS,
  type IngredientCreateInput,
  type IngredientDetail,
  type IngredientGroup,
  type IngredientOption,
  type IngredientSaveInput,
  IngredientsPageContent,
  groupIngredients,
  isIngredientStoredProperty,
} from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  view: optionalEnum(INGREDIENT_VIEWS),
  group: optionalEnum(INGREDIENT_GROUPINGS),
  id: optionalText,
});

export const Route = createFileRoute("/_authed/ingredients")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ view: search.view ?? "all", id: search.id }),
  loader: ({ context: { preloadQuery }, deps }) => ({
    listRef: preloadQuery(IngredientsPageDocument, {
      variables: { view: deps.view },
    }),
    detailRef: deps.id
      ? preloadQuery(IngredientDetailDocument, { variables: { id: deps.id } })
      : null,
  }),
  head: () => ({ meta: [{ title: "Ingredients · Peas" }] }),
  component: IngredientsPage,
});

type IngredientsPageProps = ComponentProps<typeof IngredientsPageContent>;
type RememberPage = (props: IngredientsPageProps) => void;

function IngredientsPage() {
  const { detailRef } = Route.useLoaderData();
  const lastPage = useRef<IngredientsPageProps | null>(null);
  const remember = useCallback<RememberPage>((props) => {
    lastPage.current = props;
  }, []);

  return (
    <Suspense fallback={<PreviousIngredientsPage lastPage={lastPage} />}>
      {detailRef ? (
        <WithSelectedIngredient detailRef={detailRef} onRender={remember} />
      ) : (
        <IngredientsView selected={null} onRender={remember} />
      )}
    </Suspense>
  );
}

/**
 * Suspense-read queries suspend again whenever they refetch, which after a save (or on "Save and next") would swap the whole page for the layout's spinner. This keeps the last page on screen, dimmed and inert, until the fresh data arrives; the real page keeps its state while it waits.
 */
function PreviousIngredientsPage({
  lastPage,
}: {
  lastPage: RefObject<IngredientsPageProps | null>;
}) {
  const props = lastPage.current;
  if (!props)
    return (
      <div
        role="status"
        aria-label="Loading"
        className="flex h-full items-center justify-center"
      >
        <Spinner />
      </div>
    );
  return (
    <div inert aria-busy="true" className="opacity-70 transition-opacity">
      <IngredientsPageContent {...props} />
    </div>
  );
}

/** Reads the selected ingredient's preloaded detail; split out because hooks cannot be called conditionally. */
function WithSelectedIngredient({
  detailRef,
  onRender,
}: {
  detailRef: QueryRef<IngredientDetailQuery>;
  onRender: RememberPage;
}) {
  const { data } = useReadQuery(detailRef);
  return (
    <IngredientsView
      selected={toIngredientDetail(data.ingredient)}
      onRender={onRender}
    />
  );
}

/** The card's detail, with property states narrowed to stored properties (the API's enum also carries the computed dietary tags). */
function toIngredientDetail(
  ingredient: IngredientDetailQuery["ingredient"]
): IngredientDetail | null {
  if (!ingredient) return null;
  return {
    ...ingredient,
    propertyStates: ingredient.propertyStates.flatMap(
      ({ property, ...state }) =>
        isIngredientStoredProperty(property) ? [{ ...state, property }] : []
    ),
  };
}

function IngredientsView({
  selected,
  onRender,
}: {
  selected: IngredientDetail | null;
  onRender: RememberPage;
}) {
  const { listRef } = Route.useLoaderData();
  const { data } = useReadQuery(listRef);
  const search = Route.useSearch();
  const client = useApolloClient();
  const view = search.view ?? "all";
  const grouping = search.group ?? "name";
  const onSave = useMutationAction(SaveIngredientDocument, {
    variables: (input: IngredientSaveInput) => ({ input }),
    payload: (result) => result.saveIngredient,
    result: (result) => ({ nextId: result.saveIngredient.nextId ?? null }),
  });

  const onCreate = useMutationAction(CreateIngredientDocument, {
    variables: (input: IngredientCreateInput) => ({ input }),
    payload: (result) => result.createIngredient,
    result: (result) => ({ id: result.createIngredient.id ?? "" }),
  });

  const onSearch = useCallback(
    async (query: string, excludeId?: string): Promise<IngredientOption[]> => {
      const { data: found } = await client.query({
        query: SearchIngredientsDocument,
        variables: { query, excludeId: excludeId ?? null },
        fetchPolicy: "network-only",
      });
      return found?.searchIngredients ?? [];
    },
    [client]
  );

  const onCheckName = useCallback(
    async (
      name: string,
      excludeId: string
    ): Promise<IngredientOption | null> => {
      const { data: found } = await client.query({
        query: IngredientNameOwnerDocument,
        variables: { name, excludeId },
        fetchPolicy: "network-only",
      });
      return found?.ingredientNameOwner ?? null;
    },
    [client]
  );

  const groups = useMemo(
    () => groupIngredients(data.ingredients, grouping, view),
    [data.ingredients, grouping, view]
  );
  const shownGroups = useGroupsKeepingSelected(
    groups,
    selected?.id,
    `${view}:${grouping}`
  );

  const page: IngredientsPageProps = {
    view,
    grouping,
    groups: shownGroups,
    counts: data.ingredientCounts,
    selected,
    categoryOptions: data.ingredientCategoryNames,
    onSave,
    onCreate,
    onSearch,
    onCheckName,
  };
  useEffect(() => onRender(page));

  return <IngredientsPageContent {...page} />;
}

interface KeptGroups {
  groups: IngredientGroup[];
  selectedId: string;
  listKey: string;
}

/**
 * Saving a food can drop it from the list it's selected in (approving it leaves "Needs review"), and the list refreshes before "Save and next" opens the next card. Without its row the card would jump above the group header, so this keeps showing the list the selected food was last listed in until the selection, view or grouping changes.
 *
 * @example
 * useGroupsKeepingSelected(groupsWithoutWheat, wheatId, "unreviewed:name") // the previous groups, wheat's row included
 */
function useGroupsKeepingSelected(
  groups: IngredientGroup[],
  selectedId: string | undefined,
  listKey: string
): IngredientGroup[] {
  const [kept, setKept] = useState<KeptGroups | null>(null);
  const isListed =
    selectedId !== undefined &&
    groups.some((group) =>
      group.ingredients.some((item) => item.id === selectedId)
    );

  if (
    isListed &&
    (kept?.groups !== groups ||
      kept.selectedId !== selectedId ||
      kept.listKey !== listKey)
  )
    setKept({ groups, selectedId, listKey });

  if (
    !isListed &&
    kept &&
    kept.selectedId === selectedId &&
    kept.listKey === listKey
  )
    return kept.groups;
  return groups;
}
