import { getNotes } from "@peas/database";
import { ReactNode } from "react";

export default async function Page(): Promise<ReactNode> {
  const { notes = [] } = await getNotes();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
      <h1>Dashboard</h1>
    </div>
  );
}
