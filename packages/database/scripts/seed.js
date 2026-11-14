#!/usr/bin/env node
/* eslint-env node */
/* global console, process */
import { createScriptClient } from "./prisma-client.js";

const prisma = createScriptClient();

function slugify(name) {
  return (
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "category"
  );
}

async function main() {
  console.log("🌱 Starting database seed...");

  // Ingredient categories are CATEGORY:<name> classifications on food concepts now (seeded by db:seed:foods)

  // Create base recipe categories
  const recipeCategories = [
    { name: "Appetizers" },
    { name: "Sides" },
    { name: "Arancini" },
    { name: "Main" },
    { name: "Arepas" },
    { name: "Condiments" },
    { name: "Sauces" },
    { name: "Baked Cheese" },
    { name: "Pasta" },
    { name: "Fish" },
    { name: "Beef" },
    { name: "Stir-Fry" },
    { name: "Tacos" },
    { name: "Rice" },
  ];

  console.log("🍽️ Creating recipe categories...");
  for (const category of recipeCategories) {
    // Check if category already exists
    const existingCategory = await prisma.category.findFirst({
      where: { name: { equals: category.name, mode: "insensitive" } },
    });

    if (!existingCategory) {
      await prisma.category.create({
        data: { ...category, slug: slugify(category.name), kind: "MANUAL" },
      });
    }
  }
  console.log(`✅ Created ${recipeCategories.length} recipe categories`);

  // Create base ingredient tags
  const tags = [
    // General
    { name: "pantry" },
    { name: "fresh" },
    { name: "staple" },
    { name: "seasonal" },
    { name: "local" },
    { name: "imported" },

    // Dietary
    { name: "vegan" },
    { name: "vegetarian" },
    { name: "gluten-free" },
    { name: "dairy-free" },
    { name: "nut-free" },
    { name: "soy-free" },
    { name: "high-protein" },
    { name: "low-carb" },
    { name: "keto" },
    { name: "paleo" },

    // Cooking Techniques
    { name: "raw" },
    { name: "baking" },
    { name: "roasting" },
    { name: "grilling" },
    { name: "sautéing" },
    { name: "pickling" },
    { name: "fermenting" },
    { name: "boiling" },
    { name: "frying" },
    { name: "steaming" },
    { name: "slow-cook" },
    { name: "pressure-cook" },
    { name: "dehydrating" },

    // Regional/Cultural Tags (from categorization mapping)
    { name: "asian" },
    { name: "japanese" },
    { name: "colombian" },
    { name: "latam" },
    { name: "mexican" },
    { name: "brazilian" },
    { name: "italian" },
    { name: "european" },
    { name: "french" },
    { name: "german" },
    { name: "indian" },
    { name: "thai" },
    { name: "vietnamese" },
    { name: "korean" },
    { name: "chinese" },
    { name: "mediterranean" },
    { name: "middle-eastern" },
    { name: "african" },
    { name: "caribbean" },
    { name: "american" },
    { name: "cajun" },
    { name: "southern" },
    { name: "nordic" },
    { name: "spanish" },
    { name: "greek" },
    { name: "turkish" },
    { name: "ethiopian" },

    // Recipe Categories (from categorization mapping)
    { name: "Appetizers" },
    { name: "Sides" },
    { name: "Arancini" },
    { name: "Main" },
    { name: "Arepas" },
    { name: "Condiments" },
    { name: "Sauces" },
    { name: "Baked Cheese" },
    { name: "Pasta" },
    { name: "Fish" },
    { name: "Beef" },
    { name: "Stir-Fry" },
    { name: "Tacos" },
    { name: "Rice" },

    { name: "latin-american" },
    { name: "north-american" },
  ];

  console.log("🏷️ Creating ingredient tags...");
  for (const tag of tags) {
    await prisma.ingredientTag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    });
  }
  console.log(`✅ Created ${tags.length} ingredient tags`);

  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
