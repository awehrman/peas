#!/usr/bin/env node
/* eslint-env node */

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
    { name: "vegan-friendly" },
    { name: "vegetarian-friendly" },
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

    // Cuisines
    { name: "african" },
    { name: "american" },
    { name: "asian" },
    { name: "brazilian" },
    { name: "cajun" },
    { name: "caribbean" },
    { name: "chinese" },
    { name: "ethiopian" },
    { name: "european" },
    { name: "french" },
    { name: "german" },
    { name: "greek" },
    { name: "indian" },
    { name: "italian" },
    { name: "japanese" },
    { name: "korean" },
    { name: "latin-american" },
    { name: "mediterranean" },
    { name: "mexican" },
    { name: "middle-eastern" },
    { name: "nordic" },
    { name: "north-american" },
    { name: "spanish" },
    { name: "thai" },
    { name: "turkish" },
    { name: "vietnamese" },
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
