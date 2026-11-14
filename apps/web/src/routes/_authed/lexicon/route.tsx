import { KnowledgeLayout } from "~/components/knowledge-layout";
import { canCurateKnowledge } from "~/lib/permissions";

import { createFileRoute, redirect } from "@tanstack/react-router";

/** The lexicon is part of the Knowledge section; the GraphQL resolver enforces it too. */
export const Route = createFileRoute("/_authed/lexicon")({
  beforeLoad: ({ context }) => {
    if (!canCurateKnowledge(context.viewer)) throw redirect({ to: "/" });
  },
  component: KnowledgeLayout,
});
