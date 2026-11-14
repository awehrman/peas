import { LoginForm } from "~/components/credential-forms";
import { optionalText } from "~/lib/search";
import { getViewerFn } from "~/server/auth.functions";

import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ error: optionalText }),
  beforeLoad: async () => {
    if (await getViewerFn()) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Sign in · Peas" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { error } = Route.useSearch();
  return <LoginForm error={error} />;
}
