import { ReactNode } from "react";
import { getNoteCount } from "../actions";

export async function NotesPageContent(): Promise<ReactNode> {
  const count = await getNoteCount();
  return <p>{count} Notes</p>;
}
