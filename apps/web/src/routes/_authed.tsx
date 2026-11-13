import { AuthenticatedLayout } from "~/components/authenticated-layout";
import { type ViewerSummary, getViewerFn } from "~/server/auth.functions";

import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

/** How long the browser reuses the viewer for navigations within the signed-in pages. */
const VIEWER_REUSE_MS = 60_000;

let lastViewer: { viewer: ViewerSummary; checkedAt: number } | null = null;

/**
 * Every signed-in page lives under this pathless layout. `beforeLoad` only shapes navigation; each GraphQL resolver and server function still authorizes the request itself. Entering the layout always checks the session; moving between signed-in pages (cause "stay") reuses the last answer for a minute instead of a round trip per click.
 */
export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ cause }) => {
    const isBrowser = typeof window !== "undefined";
    if (
      isBrowser &&
      cause === "stay" &&
      lastViewer &&
      Date.now() - lastViewer.checkedAt < VIEWER_REUSE_MS
    )
      return { viewer: lastViewer.viewer };

    const viewer = await getViewerFn();
    if (!viewer) {
      lastViewer = null;
      throw redirect({ to: "/login" });
    }
    if (isBrowser) lastViewer = { viewer, checkedAt: Date.now() };
    return { viewer };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { viewer } = Route.useRouteContext();
  return (
    <AuthenticatedLayout viewer={viewer}>
      <Outlet />
    </AuthenticatedLayout>
  );
}
