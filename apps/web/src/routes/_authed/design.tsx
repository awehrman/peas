import { DesignSystem } from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/design")({
  head: () => ({ meta: [{ title: "Design system · Peas" }] }),
  component: DesignSystem,
});
