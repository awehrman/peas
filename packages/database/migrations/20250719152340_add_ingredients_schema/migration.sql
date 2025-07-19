-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('VEGAN', 'VEGETARIAN', 'GLUTEN_FREE', 'MEAT', 'FISH', 'DAIRY', 'EGG', 'GRAIN', 'LEGUME', 'FRUIT', 'VEGETABLE', 'HERB', 'SPICE', 'NUTS', 'SHELLFISH', 'SOY', 'SESAME', 'CORN', 'ALCOHOL');

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plural" TEXT NOT NULL,
    "description" TEXT,
    "parentIngredientId" TEXT,
    "isChildVariant" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alias" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plural" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,

    CONSTRAINT "Alias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientProperty" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL,

    CONSTRAINT "IngredientProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "IngredientCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "IngredientTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_Substitutions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_Substitutions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_IngredientToIngredientTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_IngredientToIngredientTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "IngredientTag_name_key" ON "IngredientTag"("name");

-- CreateIndex
CREATE INDEX "_Substitutions_B_index" ON "_Substitutions"("B");

-- CreateIndex
CREATE INDEX "_IngredientToIngredientTag_B_index" ON "_IngredientToIngredientTag"("B");

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_parentIngredientId_fkey" FOREIGN KEY ("parentIngredientId") REFERENCES "Ingredient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "IngredientCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alias" ADD CONSTRAINT "Alias_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientProperty" ADD CONSTRAINT "IngredientProperty_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Substitutions" ADD CONSTRAINT "_Substitutions_A_fkey" FOREIGN KEY ("A") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Substitutions" ADD CONSTRAINT "_Substitutions_B_fkey" FOREIGN KEY ("B") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IngredientToIngredientTag" ADD CONSTRAINT "_IngredientToIngredientTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IngredientToIngredientTag" ADD CONSTRAINT "_IngredientToIngredientTag_B_fkey" FOREIGN KEY ("B") REFERENCES "IngredientTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
