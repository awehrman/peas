-- Coordination parts: "salt and pepper" stores salt as part 0 and pepper as part 1 of the same segment.
ALTER TABLE "IngredientMention" ADD COLUMN "partIndex" INTEGER NOT NULL DEFAULT 0;
DROP INDEX "IngredientMention_parsedLineId_segmentIndex_key";
CREATE UNIQUE INDEX "IngredientMention_parsedLineId_segmentIndex_partIndex_key" ON "IngredientMention"("parsedLineId", "segmentIndex", "partIndex");

-- Background reinterpretation runs.
CREATE TYPE "ReinterpretKind" AS ENUM ('REINTERPRET_BY_REVISION', 'REPARSE_BY_VERSION');

CREATE TABLE "ReinterpretRun" (
    "id" UUID NOT NULL,
    "jobId" TEXT NOT NULL,
    "kind" "ReinterpretKind" NOT NULL,
    "revision" INTEGER,
    "parserVersion" TEXT,
    "scope" JSONB,
    "status" "QueueJobStatus" NOT NULL DEFAULT 'PENDING',
    "totalLines" INTEGER NOT NULL DEFAULT 0,
    "processedLines" INTEGER NOT NULL DEFAULT 0,
    "batchCount" INTEGER NOT NULL DEFAULT 0,
    "completedBatches" INTEGER NOT NULL DEFAULT 0,
    "failedBatches" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReinterpretRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReinterpretRun_jobId_key" ON "ReinterpretRun"("jobId");
CREATE INDEX "ReinterpretRun_status_idx" ON "ReinterpretRun"("status");
