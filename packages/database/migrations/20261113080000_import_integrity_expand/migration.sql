-- Import integrity, expand step: structured sources (NoteSource, URL checks, books and lookups),
-- category memberships (NoteCategory), duplicate candidates, and soft deletion for notes.
-- Additive only: the implicit join tables and legacy columns stay until the contract migration.
-- Values that need application code (normalized URLs, canonical keys, slugs, hashes) are filled
-- by scripts/backfill-sources-and-categories.ts.

-- CreateEnum
CREATE TYPE "DuplicateKind" AS ENUM ('EXACT', 'LIKELY', 'POSSIBLE');

-- CreateEnum
CREATE TYPE "DuplicateCandidateStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "CategoryKind" AS ENUM ('MANUAL', 'CONCEPT');

-- CreateEnum
CREATE TYPE "CategoryAssignmentState" AS ENUM ('INFERRED', 'APPROVED', 'EXCLUDED');

-- CreateEnum
CREATE TYPE "CategoryAssignmentOrigin" AS ENUM ('IMPORT', 'MANUAL', 'CONCEPT_RULE', 'DUPLICATE_MERGE');

-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('URL', 'BOOK', 'OTHER');

-- CreateEnum
CREATE TYPE "UrlCheckStatus" AS ENUM ('UNCHECKED', 'REACHABLE', 'UNREACHABLE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "BookMatchStatus" AS ENUM ('UNMATCHED', 'AUTO_MATCHED', 'CONFIRMED', 'MANUAL');

-- CreateEnum
CREATE TYPE "BookLookupStatus" AS ENUM ('PENDING', 'MATCHED', 'AMBIGUOUS', 'NO_MATCH', 'ERROR', 'LEFT_UNRESOLVED');

-- CreateEnum
CREATE TYPE "NoteSourceOrigin" AS ENUM ('EVERNOTE_IMPORT', 'DUPLICATE_MERGE', 'MANUAL');

-- DropForeignKey
ALTER TABLE "URL" DROP CONSTRAINT "URL_sourceId_fkey";

-- AlterTable: keep the stored URL as the original
ALTER TABLE "URL" RENAME COLUMN "url" TO "originalUrl";
ALTER INDEX "URL_url_idx" RENAME TO "URL_originalUrl_idx";

-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "authors" TEXT[],
ADD COLUMN     "coverId" INTEGER,
ADD COLUMN     "isbn10" TEXT,
ADD COLUMN     "isbn13" TEXT,
ADD COLUMN     "matchStatus" "BookMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
ADD COLUMN     "openLibraryEditionKey" TEXT,
ADD COLUMN     "openLibraryWorkKey" TEXT,
ADD COLUMN     "originalTitle" TEXT,
ADD COLUMN     "provenance" JSONB,
ADD COLUMN     "publishedYear" INTEGER,
ADD COLUMN     "subtitle" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "conceptId" UUID,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "kind" "CategoryKind" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "ruleVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "traversal" "FoodRelationshipType"[] DEFAULT ARRAY['IS_A', 'PART_OF']::"FoodRelationshipType"[];

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedReason" TEXT,
ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "rawHtmlHash" TEXT,
ADD COLUMN     "supersededById" TEXT,
ADD COLUMN     "titleSimHashBands" TEXT[];

-- AlterTable
ALTER TABLE "Source" ADD COLUMN     "canonicalKey" TEXT,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "kind" "SourceKind" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "URL" ADD COLUMN     "canonicalUrl" TEXT,
ADD COLUMN     "checkStatus" "UrlCheckStatus" NOT NULL DEFAULT 'UNCHECKED',
ADD COLUMN     "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "lastFailureReason" TEXT,
ADD COLUMN     "lastFinalUrl" TEXT,
ADD COLUMN     "lastHttpStatus" INTEGER,
ADD COLUMN     "lastSuccessfulVisitAt" TIMESTAMP(3),
ADD COLUMN     "normalizedUrl" TEXT;

-- CreateTable
CREATE TABLE "DuplicateCandidate" (
    "id" UUID NOT NULL,
    "noteId" TEXT NOT NULL,
    "existingNoteId" TEXT NOT NULL,
    "kind" "DuplicateKind" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "signals" JSONB NOT NULL,
    "status" "DuplicateCandidateStatus" NOT NULL DEFAULT 'PENDING',
    "resolution" JSONB,
    "resolutionEffects" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DuplicateCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteCategory" (
    "id" UUID NOT NULL,
    "noteId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "state" "CategoryAssignmentState" NOT NULL,
    "origin" "CategoryAssignmentOrigin" NOT NULL,
    "evidence" JSONB,
    "ruleVersion" INTEGER,
    "lexiconRevision" INTEGER,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookLookup" (
    "id" UUID NOT NULL,
    "queryKey" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "status" "BookLookupStatus" NOT NULL DEFAULT 'PENDING',
    "candidates" JSONB,
    "provider" TEXT NOT NULL DEFAULT 'openlibrary',
    "fetchedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorReason" TEXT,
    "bookId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookLookup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteSource" (
    "id" UUID NOT NULL,
    "noteId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "originalText" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "origin" "NoteSourceOrigin" NOT NULL DEFAULT 'EVERNOTE_IMPORT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (before the data copy, which relies on ON CONFLICT)
CREATE UNIQUE INDEX "NoteCategory_noteId_categoryId_key" ON "NoteCategory"("noteId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "NoteSource_noteId_sourceId_key" ON "NoteSource"("noteId", "sourceId");

-- One URL per source: a source holding several URLs is split, each extra URL getting its own
-- source with the same note and recipe links, before URL.sourceId becomes unique.
CREATE TABLE "_url_split" AS
SELECT ranked.id AS url_id,
       ranked."sourceId" AS old_source_id,
       'split' || md5(ranked.id || clock_timestamp()::text) AS new_source_id
FROM (
  SELECT id, "sourceId", row_number() OVER (PARTITION BY "sourceId" ORDER BY "createdAt", id) AS position
  FROM "URL"
) ranked
WHERE ranked.position > 1;

INSERT INTO "Source" ("id", "createdAt", "updatedAt")
SELECT new_source_id, now(), now() FROM "_url_split";

INSERT INTO "_NoteToSource" ("A", "B")
SELECT link."A", split.new_source_id
FROM "_url_split" split
JOIN "_NoteToSource" link ON link."B" = split.old_source_id
ON CONFLICT DO NOTHING;

INSERT INTO "_RecipeToSource" ("A", "B")
SELECT link."A", split.new_source_id
FROM "_url_split" split
JOIN "_RecipeToSource" link ON link."B" = split.old_source_id
ON CONFLICT DO NOTHING;

UPDATE "URL" url SET "sourceId" = split.new_source_id
FROM "_url_split" split
WHERE url.id = split.url_id;

DROP TABLE "_url_split";

-- Source kinds
UPDATE "Source" source SET "kind" = 'URL'
WHERE EXISTS (SELECT 1 FROM "URL" url WHERE url."sourceId" = source.id);

UPDATE "Source" SET "kind" = 'BOOK'
WHERE "bookId" IS NOT NULL AND "kind" <> 'URL';

-- Legacy URL state becomes check state
UPDATE "URL" SET "checkStatus" = 'UNREACHABLE', "consecutiveFailures" = 1
WHERE "isBrokenLink";

UPDATE "URL" SET "checkStatus" = 'REACHABLE', "lastSuccessfulVisitAt" = "lastAccessed", "lastCheckedAt" = "lastAccessed"
WHERE NOT "isBrokenLink" AND "lastAccessed" IS NOT NULL;

-- Legacy book fields
UPDATE "Book" SET
  "authors" = CASE WHEN "author" IS NOT NULL AND btrim("author") <> '' THEN ARRAY[btrim("author")] ELSE ARRAY[]::TEXT[] END,
  "publishedYear" = CASE WHEN "publicationDate" IS NOT NULL THEN EXTRACT(YEAR FROM "publicationDate")::INTEGER END,
  "originalTitle" = "title",
  "isbn13" = CASE WHEN length(regexp_replace(coalesce("isbn", ''), '[^0-9Xx]', '', 'g')) = 13 THEN regexp_replace("isbn", '[^0-9]', '', 'g') END,
  "isbn10" = CASE WHEN length(regexp_replace(coalesce("isbn", ''), '[^0-9Xx]', '', 'g')) = 10 THEN upper(regexp_replace("isbn", '[^0-9Xx]', '', 'g')) END;

UPDATE "Note" SET "titleSimHashBands" = ARRAY[]::TEXT[] WHERE "titleSimHashBands" IS NULL;

-- Note sources from the implicit joins, keeping the Evernote source string
INSERT INTO "NoteSource" ("id", "noteId", "sourceId", "originalText", "isPrimary", "origin", "createdAt")
SELECT gen_random_uuid(), link."A", link."B", metadata."source", false, 'EVERNOTE_IMPORT', source."createdAt"
FROM "_NoteToSource" link
JOIN "Note" note ON note.id = link."A"
JOIN "Source" source ON source.id = link."B"
LEFT JOIN "EvernoteMetadata" metadata ON metadata.id = note."evernoteMetadataId"
ON CONFLICT DO NOTHING;

INSERT INTO "NoteSource" ("id", "noteId", "sourceId", "originalText", "isPrimary", "origin", "createdAt")
SELECT gen_random_uuid(), recipe."noteId", link."B", NULL, false, 'MANUAL', source."createdAt"
FROM "_RecipeToSource" link
JOIN "Recipe" recipe ON recipe.id = link."A"
JOIN "Source" source ON source.id = link."B"
WHERE NOT EXISTS (
  SELECT 1 FROM "_NoteToSource" existing WHERE existing."A" = recipe."noteId" AND existing."B" = link."B"
)
ON CONFLICT DO NOTHING;

UPDATE "NoteSource" target SET "isPrimary" = true
FROM (
  SELECT DISTINCT ON ("noteId") id FROM "NoteSource" ORDER BY "noteId", "createdAt", id
) first_source
WHERE target.id = first_source.id;

-- Category memberships from the implicit joins. A recipe is the curated copy of its note, so its
-- categories are approved manual choices, and a note category its recipe dropped is an exclusion.
INSERT INTO "NoteCategory" ("id", "noteId", "categoryId", "state", "origin", "createdAt", "updatedAt")
SELECT gen_random_uuid(), recipe."noteId", link."A", 'APPROVED', 'MANUAL', now(), now()
FROM "_CategoryToRecipe" link
JOIN "Recipe" recipe ON recipe.id = link."B"
ON CONFLICT DO NOTHING;

INSERT INTO "NoteCategory" ("id", "noteId", "categoryId", "state", "origin", "createdAt", "updatedAt")
SELECT gen_random_uuid(), link."B", link."A",
       CASE WHEN recipe.id IS NULL THEN 'APPROVED'::"CategoryAssignmentState" ELSE 'EXCLUDED'::"CategoryAssignmentState" END,
       CASE WHEN recipe.id IS NULL THEN 'IMPORT'::"CategoryAssignmentOrigin" ELSE 'MANUAL'::"CategoryAssignmentOrigin" END,
       now(), now()
FROM "_CategoryToNote" link
LEFT JOIN "Recipe" recipe ON recipe."noteId" = link."B"
ON CONFLICT DO NOTHING;

-- CreateIndex
CREATE INDEX "DuplicateCandidate_status_kind_idx" ON "DuplicateCandidate"("status", "kind");

-- CreateIndex
CREATE INDEX "DuplicateCandidate_existingNoteId_idx" ON "DuplicateCandidate"("existingNoteId");

-- CreateIndex
CREATE UNIQUE INDEX "DuplicateCandidate_noteId_existingNoteId_key" ON "DuplicateCandidate"("noteId", "existingNoteId");

-- CreateIndex
CREATE INDEX "NoteCategory_categoryId_state_idx" ON "NoteCategory"("categoryId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "BookLookup_queryKey_key" ON "BookLookup"("queryKey");

-- CreateIndex
CREATE INDEX "BookLookup_status_idx" ON "BookLookup"("status");

-- CreateIndex
CREATE INDEX "NoteSource_sourceId_idx" ON "NoteSource"("sourceId");

-- At most one primary source per note (Prisma cannot express partial indexes)
CREATE UNIQUE INDEX "note_source_one_primary" ON "NoteSource"("noteId") WHERE "isPrimary";

-- CreateIndex
CREATE UNIQUE INDEX "Book_openLibraryWorkKey_key" ON "Book"("openLibraryWorkKey");

-- CreateIndex
CREATE INDEX "Book_isbn13_idx" ON "Book"("isbn13");

-- CreateIndex
CREATE INDEX "Book_isbn10_idx" ON "Book"("isbn10");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_conceptId_idx" ON "Category"("conceptId");

-- CreateIndex
CREATE INDEX "Note_titleSimHashBands_idx" ON "Note" USING GIN ("titleSimHashBands");

-- CreateIndex
CREATE INDEX "Note_rawHtmlHash_idx" ON "Note"("rawHtmlHash");

-- CreateIndex
CREATE INDEX "Note_contentHash_idx" ON "Note"("contentHash");

-- CreateIndex
CREATE INDEX "Note_archivedAt_idx" ON "Note"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Source_canonicalKey_key" ON "Source"("canonicalKey");

-- CreateIndex
CREATE INDEX "Source_kind_idx" ON "Source"("kind");

-- CreateIndex
CREATE INDEX "Source_bookId_idx" ON "Source"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "URL_sourceId_key" ON "URL"("sourceId");

-- CreateIndex
CREATE INDEX "URL_normalizedUrl_idx" ON "URL"("normalizedUrl");

-- CreateIndex
CREATE INDEX "URL_lastFinalUrl_idx" ON "URL"("lastFinalUrl");

-- CreateIndex
CREATE INDEX "URL_checkStatus_idx" ON "URL"("checkStatus");

-- CreateIndex
CREATE INDEX "URL_lastCheckedAt_idx" ON "URL"("lastCheckedAt");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateCandidate" ADD CONSTRAINT "DuplicateCandidate_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateCandidate" ADD CONSTRAINT "DuplicateCandidate_existingNoteId_fkey" FOREIGN KEY ("existingNoteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateCandidate" ADD CONSTRAINT "DuplicateCandidate_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "FoodConcept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteCategory" ADD CONSTRAINT "NoteCategory_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteCategory" ADD CONSTRAINT "NoteCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteCategory" ADD CONSTRAINT "NoteCategory_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "URL" ADD CONSTRAINT "URL_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookLookup" ADD CONSTRAINT "BookLookup_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteSource" ADD CONSTRAINT "NoteSource_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteSource" ADD CONSTRAINT "NoteSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;
