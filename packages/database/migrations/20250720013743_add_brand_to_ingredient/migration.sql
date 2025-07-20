-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_IngredientBrands" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_IngredientBrands_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE INDEX "_IngredientBrands_B_index" ON "_IngredientBrands"("B");

-- AddForeignKey
ALTER TABLE "_IngredientBrands" ADD CONSTRAINT "_IngredientBrands_A_fkey" FOREIGN KEY ("A") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IngredientBrands" ADD CONSTRAINT "_IngredientBrands_B_fkey" FOREIGN KEY ("B") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
