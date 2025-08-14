#!/usr/bin/env node
/* eslint-env node */
/* global console, process */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create base ingredient categories
  const categories = [
    // Core Food Groups
    { name: "Vegetables" },
    { name: "Fruits" },
    { name: "Grains" },
    { name: "Legumes" },
    { name: "Meat" },
    { name: "Poultry" },
    { name: "Fish" },
    { name: "Shellfish" },
    { name: "Dairy" },
    { name: "Eggs" },

    // Flavoring & Pantry Essentials
    { name: "Spices" },
    { name: "Herbs" },
    { name: "Oils" },
    { name: "Vinegars" },
    { name: "Condiments" },
    { name: "Sauces" },
    { name: "Sweeteners" },
    { name: "Salts" },
    { name: "Baking Ingredients" },

    // Prepared / Preserved
    { name: "Canned Goods" },
    { name: "Frozen Items" },
    { name: "Fermented Foods" },
    { name: "Pickled Items" },
    { name: "Jams & Spreads" },
    { name: "Pasta & Noodles" },
    { name: "Breads" },
    { name: "Snacks" },

    // Drinks
    { name: "Non-Dairy Milks" },
    { name: "Juices" },
    { name: "Alcohol" },
    { name: "Beverages" },

    // Specialty / Dietary
    { name: "Plant-Based Proteins" },
    { name: "Gluten-Free Products" },
    { name: "Protein Powders" },
    { name: "Supplements" },

    // Non-food (optional)
    { name: "Equipment" },
    { name: "Paper Products" },
  ];

  console.log("📂 Creating ingredient categories...");
  for (const category of categories) {
    // Check if category already exists
    const existingCategory = await prisma.ingredientCategory.findFirst({
      where: { name: category.name },
    });

    if (!existingCategory) {
      await prisma.ingredientCategory.create({
        data: category,
      });
    }
  }
  console.log(`✅ Created ${categories.length} ingredient categories`);

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
      where: { name: category.name },
    });

    if (!existingCategory) {
      await prisma.category.create({
        data: category,
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
