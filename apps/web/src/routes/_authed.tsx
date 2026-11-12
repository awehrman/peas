import { AuthenticatedLayout } from "~/components/authenticated-layout";
import { getViewerFn } from "~/server/auth.functions";

import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Every signed-in page lives under this pathless layout. `beforeLoad` only shapes navigation; each GraphQL resolver and server function still authorizes the request itself.
 */
export const Route = createFileRoute("/_authed")({
  beforeLoad: async () => {
    const viewer = await getViewerFn();
    if (!viewer) throw redirect({ to: "/login" });
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
