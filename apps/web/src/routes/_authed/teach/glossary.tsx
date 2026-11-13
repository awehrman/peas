import { GlossaryPageContent } from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/teach/glossary")({
  head: () => ({ meta: [{ title: "Glossary · Teach Peas · Peas" }] }),
  component: GlossaryPageContent,
});
