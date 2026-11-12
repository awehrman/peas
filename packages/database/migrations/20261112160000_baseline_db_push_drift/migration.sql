-- Baseline: objects previously applied with `prisma db push` that had no migration.
-- Generated with: prisma migrate diff --from-migrations migrations --to-schema-datamodel schema.prisma --script

-- CreateEnum
CREATE TYPE "public"."GrammarRuleDefinitionType" AS ENUM ('RULE', 'LIST');

-- CreateEnum
CREATE TYPE "public"."ActiveParser" AS ENUM ('STATIC_V1', 'DATABASE');

-- AlterTable
ALTER TABLE "public"."ParsedIngredientLine" ADD COLUMN     "parserVersion" TEXT;

-- CreateTable
CREATE TABLE "public"."GrammarRule" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GrammarRuleDefinition" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "public"."GrammarRuleDefinitionType" NOT NULL DEFAULT 'RULE',
    "example" TEXT NOT NULL DEFAULT '',
    "rule" TEXT NOT NULL DEFAULT '',
    "formatter" TEXT NOT NULL DEFAULT '',
    "list" TEXT[],
    "grammarRuleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarRuleDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GrammarTest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GrammarTestExpectation" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "grammarTestId" TEXT NOT NULL,

    CONSTRAINT "GrammarTestExpectation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GrammarVersion" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "ruleCount" INTEGER NOT NULL,
    "testsPassed" INTEGER NOT NULL DEFAULT 0,
    "testsTotal" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrammarVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Recipe" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "imageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AppSetting" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "activeParser" "public"."ActiveParser" NOT NULL DEFAULT 'STATIC_V1',
    "activeGrammarVersionId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_CategoryToRecipe" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CategoryToRecipe_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_RecipeToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RecipeToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_RecipeToSource" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RecipeToSource_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "GrammarRule_name_key" ON "public"."GrammarRule"("name");

-- CreateIndex
CREATE INDEX "GrammarRule_order_idx" ON "public"."GrammarRule"("order");

-- CreateIndex
CREATE INDEX "GrammarRuleDefinition_grammarRuleId_idx" ON "public"."GrammarRuleDefinition"("grammarRuleId");

-- CreateIndex
CREATE INDEX "GrammarTestExpectation_grammarTestId_idx" ON "public"."GrammarTestExpectation"("grammarTestId");

-- CreateIndex
CREATE UNIQUE INDEX "GrammarVersion_hash_key" ON "public"."GrammarVersion"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_noteId_key" ON "public"."Recipe"("noteId");

-- CreateIndex
CREATE INDEX "Recipe_title_idx" ON "public"."Recipe"("title");

-- CreateIndex
CREATE INDEX "_CategoryToRecipe_B_index" ON "public"."_CategoryToRecipe"("B");

-- CreateIndex
CREATE INDEX "_RecipeToTag_B_index" ON "public"."_RecipeToTag"("B");

-- CreateIndex
CREATE INDEX "_RecipeToSource_B_index" ON "public"."_RecipeToSource"("B");

-- AddForeignKey
ALTER TABLE "public"."GrammarRuleDefinition" ADD CONSTRAINT "GrammarRuleDefinition_grammarRuleId_fkey" FOREIGN KEY ("grammarRuleId") REFERENCES "public"."GrammarRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GrammarTestExpectation" ADD CONSTRAINT "GrammarTestExpectation_grammarTestId_fkey" FOREIGN KEY ("grammarTestId") REFERENCES "public"."GrammarTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Recipe" ADD CONSTRAINT "Recipe_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "public"."Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Recipe" ADD CONSTRAINT "Recipe_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "public"."Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AppSetting" ADD CONSTRAINT "AppSetting_activeGrammarVersionId_fkey" FOREIGN KEY ("activeGrammarVersionId") REFERENCES "public"."GrammarVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CategoryToRecipe" ADD CONSTRAINT "_CategoryToRecipe_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CategoryToRecipe" ADD CONSTRAINT "_CategoryToRecipe_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_RecipeToTag" ADD CONSTRAINT "_RecipeToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_RecipeToTag" ADD CONSTRAINT "_RecipeToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_RecipeToSource" ADD CONSTRAINT "_RecipeToSource_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_RecipeToSource" ADD CONSTRAINT "_RecipeToSource_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

