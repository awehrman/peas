-- Phase 7: the legacy ingredient tables. Food concepts replaced them; LegacyIngredientMapping keeps the old ids as plain text. IngredientTag and Brand stay (linked to concepts and products).

-- DropForeignKey
ALTER TABLE "Alias" DROP CONSTRAINT "Alias_ingredientId_fkey";

-- DropForeignKey
ALTER TABLE "Ingredient" DROP CONSTRAINT "Ingredient_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Ingredient" DROP CONSTRAINT "Ingredient_parentIngredientId_fkey";

-- DropForeignKey
ALTER TABLE "IngredientProperty" DROP CONSTRAINT "IngredientProperty_ingredientId_fkey";

-- DropForeignKey
ALTER TABLE "IngredientReference" DROP CONSTRAINT "IngredientReference_ingredientId_fkey";

-- DropForeignKey
ALTER TABLE "IngredientReference" DROP CONSTRAINT "IngredientReference_parsedLineId_fkey";

-- DropForeignKey
ALTER TABLE "_IngredientBrands" DROP CONSTRAINT "_IngredientBrands_A_fkey";

-- DropForeignKey
ALTER TABLE "_IngredientBrands" DROP CONSTRAINT "_IngredientBrands_B_fkey";

-- DropForeignKey
ALTER TABLE "_IngredientToIngredientTag" DROP CONSTRAINT "_IngredientToIngredientTag_A_fkey";

-- DropForeignKey
ALTER TABLE "_IngredientToIngredientTag" DROP CONSTRAINT "_IngredientToIngredientTag_B_fkey";

-- DropForeignKey
ALTER TABLE "_Substitutions" DROP CONSTRAINT "_Substitutions_A_fkey";

-- DropForeignKey
ALTER TABLE "_Substitutions" DROP CONSTRAINT "_Substitutions_B_fkey";

-- DropTable
DROP TABLE "Alias";

-- DropTable
DROP TABLE "IngredientProperty";

-- DropTable
DROP TABLE "IngredientReference";

-- DropTable
DROP TABLE "_IngredientBrands";

-- DropTable
DROP TABLE "_IngredientToIngredientTag";

-- DropTable
DROP TABLE "_Substitutions";

-- DropTable
DROP TABLE "Ingredient";

-- DropTable
DROP TABLE "IngredientCategory";

-- DropEnum
DROP TYPE "PropertyType";
