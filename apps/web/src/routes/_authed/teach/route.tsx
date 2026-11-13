import { KnowledgeLayout } from "~/components/knowledge-layout";
import { canCurateKnowledge } from "~/lib/permissions";

import { createFileRoute, redirect } from "@tanstack/react-router";

/** Teach Peas is part of the Knowledge section; the GraphQL resolvers enforce it too. */
export const Route = createFileRoute("/_authed/teach")({
  beforeLoad: ({ context }) => {
    if (!canCurateKnowledge(context.viewer)) throw redirect({ to: "/" });
  },
  component: KnowledgeLayout,
});
