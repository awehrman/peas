import Link from "next/link";
import { ReactNode } from "react";

export default function IngredientsPage(): ReactNode {
  // This would typically fetch ingredients from your database
  const ingredients = [
    { id: "1", name: "Flour", category: "Dry Goods", count: 5 },
    { id: "2", name: "Sugar", category: "Dry Goods", count: 3 },
    { id: "3", name: "Eggs", category: "Dairy & Eggs", count: 2 },
    { id: "4", name: "Milk", category: "Dairy & Eggs", count: 1 },
    { id: "5", name: "Butter", category: "Dairy & Eggs", count: 4 },
    { id: "6", name: "Salt", category: "Spices & Seasonings", count: 7 },
    { id: "7", name: "Pepper", category: "Spices & Seasonings", count: 2 },
    { id: "8", name: "Olive Oil", category: "Oils & Vinegars", count: 1 },
  ];

  // Group ingredients by category
  const ingredientsByCategory = ingredients.reduce<
    Record<string, typeof ingredients>
  >((acc, ingredient) => {
    const category = ingredient.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(ingredient);
    return acc;
  }, {});

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Ingredients</h1>
        <div className="flex gap-4">
          <Link
            href="/"
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search ingredients..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(ingredientsByCategory).map(
          ([category, categoryIngredients]) => (
            <div
              key={category}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
            >
              <div className="bg-gray-100 dark:bg-gray-700 px-6 py-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {category}
                </h2>
              </div>
              <div className="p-6">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {categoryIngredients.map((ingredient) => (
                    <li
                      key={ingredient.id}
                      className="py-3 flex justify-between items-center"
                    >
                      <span className="text-gray-900 dark:text-white">
                        {ingredient.name}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Used in {ingredient.count}{" "}
                        {ingredient.count === 1 ? "recipe" : "recipes"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
