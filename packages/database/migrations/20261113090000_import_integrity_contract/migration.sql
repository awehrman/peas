-- Import integrity, contract step: drops the implicit note/recipe joins to sources and categories
-- and the legacy URL and book columns, now that NoteSource and NoteCategory hold that data, and makes
-- the identity keys required. Run `yarn workspace @peas/database db:backfill:import-integrity` first;
-- this migration refuses to run while any row still lacks a key.

DO $$
DECLARE
  missing_source_keys INTEGER;
  missing_url_keys INTEGER;
  duplicate_url_keys INTEGER;
  missing_slugs INTEGER;
  duplicate_slugs INTEGER;
BEGIN
  SELECT count(*) INTO missing_source_keys FROM "Source" WHERE "canonicalKey" IS NULL;
  SELECT count(*) INTO missing_url_keys FROM "URL" WHERE "normalizedUrl" IS NULL;
  SELECT count(*) INTO duplicate_url_keys FROM (
    SELECT "normalizedUrl" FROM "URL" WHERE "normalizedUrl" IS NOT NULL GROUP BY "normalizedUrl" HAVING count(*) > 1
  ) duplicates;
  SELECT count(*) INTO missing_slugs FROM "Category" WHERE "slug" IS NULL;
  SELECT count(*) INTO duplicate_slugs FROM (
    SELECT "slug" FROM "Category" WHERE "slug" IS NOT NULL GROUP BY "slug" HAVING count(*) > 1
  ) duplicates;

  IF missing_source_keys + missing_url_keys + duplicate_url_keys + missing_slugs + duplicate_slugs > 0 THEN
    RAISE EXCEPTION 'Run db:backfill:import-integrity before this migration: % sources without keys, % URLs without normalized URLs, % duplicate normalized URLs, % categories without slugs, % duplicate slugs',
      missing_source_keys, missing_url_keys, duplicate_url_keys, missing_slugs, duplicate_slugs;
  END IF;
END $$;

-- Rows written to the implicit joins after the expand step are copied once more, losslessly
INSERT INTO "NoteSource" ("id", "noteId", "sourceId", "originalText", "isPrimary", "origin", "createdAt")
SELECT gen_random_uuid(), link."A", link."B", metadata."source", false, 'EVERNOTE_IMPORT', now()
FROM "_NoteToSource" link
JOIN "Note" note ON note.id = link."A"
LEFT JOIN "EvernoteMetadata" metadata ON metadata.id = note."evernoteMetadataId"
ON CONFLICT DO NOTHING;

INSERT INTO "NoteSource" ("id", "noteId", "sourceId", "originalText", "isPrimary", "origin", "createdAt")
SELECT gen_random_uuid(), recipe."noteId", link."B", NULL, false, 'MANUAL', now()
FROM "_RecipeToSource" link
JOIN "Recipe" recipe ON recipe.id = link."A"
ON CONFLICT DO NOTHING;

INSERT INTO "NoteCategory" ("id", "noteId", "categoryId", "state", "origin", "createdAt", "updatedAt")
SELECT gen_random_uuid(), recipe."noteId", link."A", 'APPROVED', 'MANUAL', now(), now()
FROM "_CategoryToRecipe" link
JOIN "Recipe" recipe ON recipe.id = link."B"
ON CONFLICT DO NOTHING;

INSERT INTO "NoteCategory" ("id", "noteId", "categoryId", "state", "origin", "createdAt", "updatedAt")
SELECT gen_random_uuid(), link."B", link."A", 'APPROVED', 'IMPORT', now(), now()
FROM "_CategoryToNote" link
ON CONFLICT DO NOTHING;

-- Notes that gained their first source here get a primary one
UPDATE "NoteSource" target SET "isPrimary" = true
FROM (
  SELECT DISTINCT ON ("noteId") id FROM "NoteSource" source
  WHERE NOT EXISTS (SELECT 1 FROM "NoteSource" other WHERE other."noteId" = source."noteId" AND other."isPrimary")
  ORDER BY "noteId", "createdAt", id
) first_source
WHERE target.id = first_source.id;

-- DropForeignKey
ALTER TABLE "_CategoryToNote" DROP CONSTRAINT "_CategoryToNote_A_fkey";

-- DropForeignKey
ALTER TABLE "_CategoryToNote" DROP CONSTRAINT "_CategoryToNote_B_fkey";

-- DropForeignKey
ALTER TABLE "_CategoryToRecipe" DROP CONSTRAINT "_CategoryToRecipe_A_fkey";

-- DropForeignKey
ALTER TABLE "_CategoryToRecipe" DROP CONSTRAINT "_CategoryToRecipe_B_fkey";

-- DropForeignKey
ALTER TABLE "_NoteToSource" DROP CONSTRAINT "_NoteToSource_A_fkey";

-- DropForeignKey
ALTER TABLE "_NoteToSource" DROP CONSTRAINT "_NoteToSource_B_fkey";

-- DropForeignKey
ALTER TABLE "_RecipeToSource" DROP CONSTRAINT "_RecipeToSource_A_fkey";

-- DropForeignKey
ALTER TABLE "_RecipeToSource" DROP CONSTRAINT "_RecipeToSource_B_fkey";

-- DropIndex
DROP INDEX "URL_isBrokenLink_idx";

-- DropIndex
DROP INDEX "URL_lastAccessed_idx";

-- DropIndex
DROP INDEX "URL_normalizedUrl_idx";

-- AlterTable
ALTER TABLE "Book" DROP COLUMN "author",
DROP COLUMN "isbn",
DROP COLUMN "publicationDate";

-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "slug" SET NOT NULL;

-- AlterTable
ALTER TABLE "Source" ALTER COLUMN "canonicalKey" SET NOT NULL;

-- AlterTable
ALTER TABLE "URL" DROP COLUMN "isBrokenLink",
DROP COLUMN "lastAccessed",
ALTER COLUMN "normalizedUrl" SET NOT NULL;

-- DropTable
DROP TABLE "_CategoryToNote";

-- DropTable
DROP TABLE "_CategoryToRecipe";

-- DropTable
DROP TABLE "_NoteToSource";

-- DropTable
DROP TABLE "_RecipeToSource";

-- CreateIndex
CREATE UNIQUE INDEX "URL_normalizedUrl_key" ON "URL"("normalizedUrl");
