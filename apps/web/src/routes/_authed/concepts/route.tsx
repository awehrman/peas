import { KnowledgeLayout } from "~/components/knowledge-layout";
import { canCurateKnowledge } from "~/lib/permissions";

import { createFileRoute, redirect } from "@tanstack/react-router";

/** Concepts are part of the Knowledge section (see `canCurateKnowledge`). */
export const Route = createFileRoute("/_authed/concepts")({
  beforeLoad: ({ context }) => {
    if (!canCurateKnowledge(context.viewer)) throw redirect({ to: "/ingredients" });
  },
  component: KnowledgeLayout,
});
