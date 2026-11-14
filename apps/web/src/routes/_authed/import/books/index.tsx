import { createFileRoute, redirect } from "@tanstack/react-router";

/** Book matches are a section of the import review tab. */
export const Route = createFileRoute("/_authed/import/books/")({
  beforeLoad: () => {
    throw redirect({ to: "/import", search: { view: "review", review: "books" } });
  },
});
