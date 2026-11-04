import { ReactNode } from "react";

interface NotesPageContentProps {
  count: number;
}

export function NotesPageContent({ count }: NotesPageContentProps): ReactNode {
  return <p>{count} Notes</p>;
}
