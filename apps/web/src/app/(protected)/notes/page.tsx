import { ReactNode } from "react";

import { NOTE_STATUSES, getNotesPage } from "@peas/database";
import { NotesListPageContent } from "@peas/features";

import { getAuthOrRedirect } from "../../../lib/auth/queries/get-auth-or-redirect";
import {
  type RawSearchParams,
  getEnumParam,
  getPageParam,
  getSearchParam,
} from "../../../lib/shared/search-params";

export const dynamic = "force-dynamic";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}): Promise<ReactNode> {
  await getAuthOrRedirect();
  const params = await searchParams;

  const status = getEnumParam(params, "status", NOTE_STATUSES);
  const query = getSearchParam(params, "q");
  const data = await getNotesPage({ status, query, page: getPageParam(params) });

  return <NotesListPageContent data={data} filters={{ status, query }} />;
}
