import { getNotes } from "@peas/database";
import { ReactNode } from "react";

export default async function Page(): Promise<ReactNode> {
  const { notes = [] } = await getNotes();

  return <div>Imported Notes: {notes.length}</div>;
}
