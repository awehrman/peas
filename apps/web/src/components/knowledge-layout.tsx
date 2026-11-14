import { useReinterpretProgress } from "~/lib/apollo/use-reinterpret-progress";

import {
  KnowledgeTabs,
  ReinterpretProgressBanner,
  knowledgeSectionFor,
} from "@peas/features";
import { Outlet, useRouterState } from "@tanstack/react-router";

/** The admin Knowledge section: tabs for the review queue, concepts, and lexicon, plus progress for background reinterpretation runs. */
export function KnowledgeLayout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const progress = useReinterpretProgress();

  return (
    <div className="flex flex-col gap-6">
      <KnowledgeTabs active={knowledgeSectionFor(pathname)} />
      {progress ? <ReinterpretProgressBanner progress={progress} /> : null}
      <Outlet />
    </div>
  );
}
