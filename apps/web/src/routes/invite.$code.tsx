import { SignUpForm } from "~/components/credential-forms";
import { checkInviteFn } from "~/server/auth.functions";

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/invite/$code")({
  beforeLoad: async ({ params }) => {
    const { isValid, error } = await checkInviteFn({ data: params.code });
    if (!isValid)
      throw redirect({
        to: "/login",
        search: { error: error ?? "Invalid sign-up code" },
      });
  },
  head: () => ({ meta: [{ title: "Create account · Peas" }] }),
  component: InvitePage,
});

function InvitePage() {
  const { code } = Route.useParams();
  return <SignUpForm code={code} />;
}
