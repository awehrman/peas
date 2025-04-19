import { getNotes } from "@peas/database";
import Link from "next/link";
import { ReactNode } from "react";

export default async function Page(): Promise<ReactNode> {
  const { notes = [] } = await getNotes();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
      <h1 className="text-4xl font-bold mb-8 text-primary-600 dark:text-primary-400">
        Recipe Manager
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 w-full max-w-4xl">
        <Link
          href="/recipes"
          className="group p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-200 border border-border hover:border-primary-300 dark:hover:border-primary-600"
        >
          <h2 className="text-2xl font-semibold mb-2 text-primary-700 dark:text-primary-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            Recipes
          </h2>
          <p className="text-muted-foreground">
            Browse and manage your recipes
          </p>
        </Link>

        <Link
          href="/notes"
          className="group p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-200 border border-border hover:border-secondary-300 dark:hover:border-secondary-600"
        >
          <h2 className="text-2xl font-semibold mb-2 text-secondary-700 dark:text-secondary-300 group-hover:text-secondary-600 dark:group-hover:text-secondary-400 transition-colors">
            Notes
          </h2>
          <p className="text-muted-foreground">
            {notes.length > 0
              ? `${notes.length} notes imported`
              : "Import your first note"}
          </p>
        </Link>

        <Link
          href="/ingredients"
          className="group p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-200 border border-border hover:border-accent-300 dark:hover:border-accent-600"
        >
          <h2 className="text-2xl font-semibold mb-2 text-accent-700 dark:text-accent-300 group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
            Ingredients
          </h2>
          <p className="text-muted-foreground">Manage your ingredients</p>
        </Link>

        <Link
          href="/import"
          className="group p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-200 border border-border hover:border-primary-300 dark:hover:border-primary-600"
        >
          <h2 className="text-2xl font-semibold mb-2 text-primary-700 dark:text-primary-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            Import
          </h2>
          <p className="text-muted-foreground">
            Import recipes from external sources
          </p>
        </Link>
      </div>
    </div>
  );
}
