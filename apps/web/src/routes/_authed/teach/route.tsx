import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

/** Teach Peas is for admins; the GraphQL resolvers enforce it too. */
export const Route = createFileRoute("/_authed/teach")({
  beforeLoad: ({ context }) => {
    if (!context.viewer.isAdmin) throw redirect({ to: "/" });
  },
  component: Outlet,
});
