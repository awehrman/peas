-- CreateTable
CREATE TABLE "CorpusAnalyticsSnapshot" (
    "id" UUID NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trigger" TEXT NOT NULL,
    "lexiconRevision" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "CorpusAnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorpusAnalyticsSnapshot_takenAt_idx" ON "CorpusAnalyticsSnapshot"("takenAt");

