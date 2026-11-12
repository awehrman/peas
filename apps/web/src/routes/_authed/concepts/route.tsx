import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

/** The concept pages are for admins; the GraphQL resolvers enforce it too. */
export const Route = createFileRoute("/_authed/concepts")({
  beforeLoad: ({ context }) => {
    if (!context.viewer.isAdmin) throw redirect({ to: "/" });
  },
  component: Outlet,
});
