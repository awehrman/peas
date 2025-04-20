import Link from "next/link";
import { ReactNode } from "react";
import { Button } from "@peas/ui";

export default function ImportPage(): ReactNode {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Import Recipes</h1>
        <Link
          href="/"
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Back to Home
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Import from Evernote</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Import your recipes from Evernote. We'll parse the ingredients and
            instructions automatically.
          </p>
          <form className="space-y-4">
            <div>
              <label
                htmlFor="evernote-url"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Evernote URL or Note ID
              </label>
              <input
                type="text"
                id="evernote-url"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://www.evernote.com/shard/..."
              />
            </div>
            <Button
              type="submit"
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors"
            >
              Import from Evernote
            </Button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Import from Text</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Paste your recipe text directly. We'll try to parse the ingredients
            and instructions.
          </p>
          <form className="space-y-4">
            <div>
              <label
                htmlFor="recipe-title"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Recipe Title
              </label>
              <input
                type="text"
                id="recipe-title"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="Chocolate Chip Cookies"
              />
            </div>
            <div>
              <label
                htmlFor="recipe-text"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Recipe Text
              </label>
              <textarea
                id="recipe-text"
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="Paste your recipe here..."
              />
            </div>
            <Button
              type="submit"
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors"
            >
              Import Recipe
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
