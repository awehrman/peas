-- AlterTable
ALTER TABLE "LexiconDecision" ADD COLUMN "mentionsChanged" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CorpusHealthSnapshot" (
    "id" UUID NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trigger" TEXT NOT NULL,
    "parserVersion" TEXT NOT NULL,
    "lexiconRevision" INTEGER NOT NULL,
    "totalLines" INTEGER NOT NULL,
    "totalMentions" INTEGER NOT NULL,
    "byResolutionStatus" JSONB NOT NULL,
    "byParseStatus" JSONB NOT NULL,
    "byParserVersion" JSONB NOT NULL,
    "openDiscoveriesByType" JSONB NOT NULL,
    "verifiedCount" INTEGER NOT NULL,
    "avgCandidates" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CorpusHealthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorpusHealthSnapshot_takenAt_idx" ON "CorpusHealthSnapshot"("takenAt");
