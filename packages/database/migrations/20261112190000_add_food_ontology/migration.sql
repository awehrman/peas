-- Food ontology, lexicon, and ingredient mentions (v2 parser, Phase 2).
-- Additive only: no legacy table or column is changed.

-- Trigram matching for IngredientMention preview prefiltering (decision D20).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "ConceptStatus" AS ENUM ('PROPOSED', 'VERIFIED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "LexiconRole" AS ENUM ('FOOD', 'ATTRIBUTE', 'PREPARATION', 'DEGREE', 'MEASUREMENT_MODIFIER', 'INSTRUCTION');

-- CreateEnum
CREATE TYPE "LexiconTermKind" AS ENUM ('CANONICAL', 'ALIAS', 'PLURAL', 'REGIONAL', 'ABBREVIATION', 'VARIANT');

-- CreateEnum
CREATE TYPE "FoodRelationshipType" AS ENUM ('IS_A', 'PART_OF', 'DERIVED_FROM', 'PROCESSED_FROM');

-- CreateEnum
CREATE TYPE "AttributeValueType" AS ENUM ('ENUM', 'NUMBER', 'BOOLEAN', 'TEXT');

-- CreateEnum
CREATE TYPE "ClassificationKind" AS ENUM ('FOOD_GROUP', 'DIETARY', 'ALLERGEN', 'CATEGORY', 'CERTIFICATION');

-- CreateEnum
CREATE TYPE "TriState" AS ENUM ('TRUE', 'FALSE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ValueSource" AS ENUM ('LEGACY', 'MANUAL', 'ASSERTED', 'INFERRED');

-- CreateEnum
CREATE TYPE "ResolutionStatus" AS ENUM ('UNRESOLVED', 'AUTO_RESOLVED', 'NEEDS_REVIEW', 'VERIFIED');

-- CreateEnum
CREATE TYPE "ParseMode" AS ENUM ('CONSERVATIVE', 'EXPLORATORY');

-- CreateEnum
CREATE TYPE "PrepPosition" AS ENUM ('PRE_HEAD', 'POST_HEAD');

-- CreateEnum
CREATE TYPE "DiscoveryType" AS ENUM ('UNKNOWN_FOOD_PHRASE', 'UNKNOWN_MODIFIER', 'ATTRIBUTE_INTERPRETATION', 'IDENTITY_DECISION', 'AMBIGUOUS_MATCH', 'RELATIONSHIP_SUGGESTION', 'STRUCTURAL_PATTERN', 'VERIFIED_DRIFT');

-- CreateEnum
CREATE TYPE "DiscoveryStatus" AS ENUM ('OPEN', 'DEFERRED', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('MAP_TO_CONCEPT', 'CREATE_CONCEPT', 'CONCEPT_PLUS_ATTRIBUTE', 'CLASSIFY_MODIFIER', 'ADD_ATTRIBUTE_VALUE', 'ADD_RELATIONSHIP', 'MARK_AMBIGUOUS', 'IGNORE_TOKEN', 'REJECT', 'MERGE_CONCEPTS', 'CORRECT_MENTION', 'REVERT');

-- CreateEnum
CREATE TYPE "LegacyMappingStatus" AS ENUM ('PENDING', 'MAPPED', 'NEEDS_REVIEW', 'SKIPPED');

-- CreateTable
CREATE TABLE "FoodConcept" (
    "id" UUID NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "ConceptStatus" NOT NULL DEFAULT 'PROPOSED',
    "description" TEXT,
    "isComposed" BOOLEAN NOT NULL DEFAULT false,
    "composedRecipeId" TEXT,
    "mergedIntoId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LexiconEntry" (
    "id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "matchKey" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "role" "LexiconRole" NOT NULL,
    "kind" "LexiconTermKind",
    "locale" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'PROPOSED',
    "conceptId" UUID,
    "attributeValueId" UUID,
    "preparationId" UUID,
    "valueKey" TEXT,
    "targetKey" TEXT NOT NULL,
    "normalizerVersion" TEXT NOT NULL,
    "revisionAdded" INTEGER NOT NULL,
    "revisionRetired" INTEGER,
    "decisionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LexiconEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeDefinition" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "valueType" "AttributeValueType" NOT NULL DEFAULT 'ENUM',

    CONSTRAINT "AttributeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeValue" (
    "id" UUID NOT NULL,
    "definitionId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "AttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeApplicability" (
    "definitionId" UUID NOT NULL,
    "conceptId" UUID NOT NULL,

    CONSTRAINT "AttributeApplicability_pkey" PRIMARY KEY ("definitionId","conceptId")
);

-- CreateTable
CREATE TABLE "ConceptAttribute" (
    "conceptId" UUID NOT NULL,
    "attributeValueId" UUID NOT NULL,
    "source" "ValueSource" NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "ConceptAttribute_pkey" PRIMARY KEY ("conceptId","attributeValueId")
);

-- CreateTable
CREATE TABLE "PreparationOperation" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "PreparationOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodRelationship" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "targetId" UUID NOT NULL,
    "type" "FoodRelationshipType" NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'PROPOSED',
    "decisionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodClassification" (
    "id" UUID NOT NULL,
    "conceptId" UUID NOT NULL,
    "kind" "ClassificationKind" NOT NULL,
    "key" TEXT NOT NULL,
    "value" "TriState" NOT NULL DEFAULT 'UNKNOWN',
    "source" "ValueSource" NOT NULL DEFAULT 'MANUAL',
    "note" TEXT,

    CONSTRAINT "FoodClassification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodSubstitution" (
    "id" UUID NOT NULL,
    "fromConceptId" UUID NOT NULL,
    "toConceptId" UUID NOT NULL,
    "ratio" TEXT,
    "note" TEXT,

    CONSTRAINT "FoodSubstitution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodProduct" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" TEXT,
    "conceptId" UUID,

    CONSTRAINT "FoodProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientMention" (
    "id" UUID NOT NULL,
    "parsedLineId" TEXT NOT NULL,
    "segmentIndex" INTEGER NOT NULL,
    "rawText" TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "spanStart" INTEGER NOT NULL,
    "spanEnd" INTEGER NOT NULL,
    "syntax" JSONB NOT NULL,
    "quantity" JSONB,
    "conceptId" UUID,
    "resolution" JSONB NOT NULL,
    "resolutionStatus" "ResolutionStatus" NOT NULL DEFAULT 'UNRESOLVED',
    "score" DOUBLE PRECISION,
    "mode" "ParseMode" NOT NULL DEFAULT 'CONSERVATIVE',
    "parserVersion" TEXT NOT NULL,
    "normalizerVersion" TEXT NOT NULL,
    "resolverVersion" TEXT NOT NULL,
    "lexiconRevision" INTEGER NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngredientMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentionAttribute" (
    "mentionId" UUID NOT NULL,
    "attributeValueId" UUID NOT NULL,
    "lexiconEntryId" UUID,
    "source" "ValueSource" NOT NULL,
    "spanStart" INTEGER,
    "spanEnd" INTEGER,

    CONSTRAINT "MentionAttribute_pkey" PRIMARY KEY ("mentionId","attributeValueId")
);

-- CreateTable
CREATE TABLE "MentionPreparation" (
    "mentionId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "preparationId" UUID NOT NULL,
    "degreeKey" TEXT,
    "position" "PrepPosition" NOT NULL,
    "spanStart" INTEGER NOT NULL,
    "spanEnd" INTEGER NOT NULL,

    CONSTRAINT "MentionPreparation_pkey" PRIMARY KEY ("mentionId","order")
);

-- CreateTable
CREATE TABLE "MentionModifier" (
    "mentionId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "role" "LexiconRole" NOT NULL,
    "valueKey" TEXT NOT NULL,
    "spanStart" INTEGER NOT NULL,
    "spanEnd" INTEGER NOT NULL,

    CONSTRAINT "MentionModifier_pkey" PRIMARY KEY ("mentionId","order")
);

-- CreateTable
CREATE TABLE "Discovery" (
    "id" UUID NOT NULL,
    "type" "DiscoveryType" NOT NULL,
    "key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "DiscoveryStatus" NOT NULL DEFAULT 'OPEN',
    "mentionCount" INTEGER NOT NULL DEFAULT 0,
    "distinctNoteCount" INTEGER NOT NULL DEFAULT 0,
    "priority" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "firstSeenRevision" INTEGER NOT NULL,
    "lastSeenRevision" INTEGER NOT NULL,
    "resolvedByDecisionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryEvidence" (
    "discoveryId" UUID NOT NULL,
    "mentionId" UUID NOT NULL,
    "noteId" TEXT,
    "spanStart" INTEGER NOT NULL,
    "spanEnd" INTEGER NOT NULL,

    CONSTRAINT "DiscoveryEvidence_pkey" PRIMARY KEY ("discoveryId","mentionId")
);

-- CreateTable
CREATE TABLE "LexiconDecision" (
    "id" UUID NOT NULL,
    "type" "DecisionType" NOT NULL,
    "payload" JSONB NOT NULL,
    "effects" JSONB NOT NULL,
    "discoveryId" UUID,
    "userId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "revertedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LexiconDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LexiconRevision" (
    "id" SERIAL NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LexiconRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptMergeRecord" (
    "id" UUID NOT NULL,
    "survivorId" UUID NOT NULL,
    "mergedId" UUID NOT NULL,
    "decisionId" UUID NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConceptMergeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyIngredientMapping" (
    "legacyIngredientId" TEXT NOT NULL,
    "conceptId" UUID,
    "status" "LegacyMappingStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "migratedAt" TIMESTAMP(3),

    CONSTRAINT "LegacyIngredientMapping_pkey" PRIMARY KEY ("legacyIngredientId")
);

-- CreateTable
CREATE TABLE "_FoodConceptToIngredientTag" (
    "A" UUID NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FoodConceptToIngredientTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "FoodConcept_slug_key" ON "FoodConcept"("slug");

-- CreateIndex
CREATE INDEX "FoodConcept_status_idx" ON "FoodConcept"("status");

-- CreateIndex
CREATE INDEX "FoodConcept_canonicalName_idx" ON "FoodConcept"("canonicalName");

-- CreateIndex
CREATE INDEX "LexiconEntry_matchKey_idx" ON "LexiconEntry"("matchKey");

-- CreateIndex
CREATE INDEX "LexiconEntry_status_role_idx" ON "LexiconEntry"("status", "role");

-- CreateIndex
CREATE INDEX "LexiconEntry_conceptId_idx" ON "LexiconEntry"("conceptId");

-- CreateIndex
CREATE UNIQUE INDEX "LexiconEntry_matchKey_targetKey_key" ON "LexiconEntry"("matchKey", "targetKey");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeDefinition_key_key" ON "AttributeDefinition"("key");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeValue_definitionId_key_key" ON "AttributeValue"("definitionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "PreparationOperation_key_key" ON "PreparationOperation"("key");

-- CreateIndex
CREATE INDEX "FoodRelationship_targetId_type_idx" ON "FoodRelationship"("targetId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "FoodRelationship_sourceId_targetId_type_key" ON "FoodRelationship"("sourceId", "targetId", "type");

-- CreateIndex
CREATE INDEX "FoodClassification_key_value_idx" ON "FoodClassification"("key", "value");

-- CreateIndex
CREATE UNIQUE INDEX "FoodClassification_conceptId_key_key" ON "FoodClassification"("conceptId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "FoodSubstitution_fromConceptId_toConceptId_key" ON "FoodSubstitution"("fromConceptId", "toConceptId");

-- CreateIndex
CREATE UNIQUE INDEX "FoodProduct_brandId_name_key" ON "FoodProduct"("brandId", "name");

-- CreateIndex
CREATE INDEX "ingredient_mention_normalized_trgm" ON "IngredientMention" USING GIN ("normalizedText" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "IngredientMention_conceptId_idx" ON "IngredientMention"("conceptId");

-- CreateIndex
CREATE INDEX "IngredientMention_resolutionStatus_idx" ON "IngredientMention"("resolutionStatus");

-- CreateIndex
CREATE INDEX "IngredientMention_lexiconRevision_idx" ON "IngredientMention"("lexiconRevision");

-- CreateIndex
CREATE INDEX "IngredientMention_parserVersion_idx" ON "IngredientMention"("parserVersion");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientMention_parsedLineId_segmentIndex_key" ON "IngredientMention"("parsedLineId", "segmentIndex");

-- CreateIndex
CREATE INDEX "Discovery_status_priority_idx" ON "Discovery"("status", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "Discovery_type_key_key" ON "Discovery"("type", "key");

-- CreateIndex
CREATE INDEX "DiscoveryEvidence_mentionId_idx" ON "DiscoveryEvidence"("mentionId");

-- CreateIndex
CREATE UNIQUE INDEX "LexiconDecision_revision_key" ON "LexiconDecision"("revision");

-- CreateIndex
CREATE UNIQUE INDEX "LexiconDecision_revertedById_key" ON "LexiconDecision"("revertedById");

-- CreateIndex
CREATE INDEX "_FoodConceptToIngredientTag_B_index" ON "_FoodConceptToIngredientTag"("B");

-- AddForeignKey
ALTER TABLE "FoodConcept" ADD CONSTRAINT "FoodConcept_composedRecipeId_fkey" FOREIGN KEY ("composedRecipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodConcept" ADD CONSTRAINT "FoodConcept_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "FoodConcept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexiconEntry" ADD CONSTRAINT "LexiconEntry_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "FoodConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexiconEntry" ADD CONSTRAINT "LexiconEntry_attributeValueId_fkey" FOREIGN KEY ("attributeValueId") REFERENCES "AttributeValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexiconEntry" ADD CONSTRAINT "LexiconEntry_preparationId_fkey" FOREIGN KEY ("preparationId") REFERENCES "PreparationOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexiconEntry" ADD CONSTRAINT "LexiconEntry_revisionAdded_fkey" FOREIGN KEY ("revisionAdded") REFERENCES "LexiconRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexiconEntry" ADD CONSTRAINT "LexiconEntry_revisionRetired_fkey" FOREIGN KEY ("revisionRetired") REFERENCES "LexiconRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexiconEntry" ADD CONSTRAINT "LexiconEntry_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "LexiconDecision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeValue" ADD CONSTRAINT "AttributeValue_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "AttributeDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeApplicability" ADD CONSTRAINT "AttributeApplicability_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "AttributeDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeApplicability" ADD CONSTRAINT "AttributeApplicability_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "FoodConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptAttribute" ADD CONSTRAINT "ConceptAttribute_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "FoodConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptAttribute" ADD CONSTRAINT "ConceptAttribute_attributeValueId_fkey" FOREIGN KEY ("attributeValueId") REFERENCES "AttributeValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodRelationship" ADD CONSTRAINT "FoodRelationship_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "FoodConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodRelationship" ADD CONSTRAINT "FoodRelationship_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "FoodConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodRelationship" ADD CONSTRAINT "FoodRelationship_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "LexiconDecision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodClassification" ADD CONSTRAINT "FoodClassification_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "FoodConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodSubstitution" ADD CONSTRAINT "FoodSubstitution_fromConceptId_fkey" FOREIGN KEY ("fromConceptId") REFERENCES "FoodConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodSubstitution" ADD CONSTRAINT "FoodSubstitution_toConceptId_fkey" FOREIGN KEY ("toConceptId") REFERENCES "FoodConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodProduct" ADD CONSTRAINT "FoodProduct_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodProduct" ADD CONSTRAINT "FoodProduct_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "FoodConcept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientMention" ADD CONSTRAINT "IngredientMention_parsedLineId_fkey" FOREIGN KEY ("parsedLineId") REFERENCES "ParsedIngredientLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientMention" ADD CONSTRAINT "IngredientMention_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "FoodConcept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientMention" ADD CONSTRAINT "IngredientMention_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentionAttribute" ADD CONSTRAINT "MentionAttribute_mentionId_fkey" FOREIGN KEY ("mentionId") REFERENCES "IngredientMention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentionAttribute" ADD CONSTRAINT "MentionAttribute_attributeValueId_fkey" FOREIGN KEY ("attributeValueId") REFERENCES "AttributeValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentionAttribute" ADD CONSTRAINT "MentionAttribute_lexiconEntryId_fkey" FOREIGN KEY ("lexiconEntryId") REFERENCES "LexiconEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentionPreparation" ADD CONSTRAINT "MentionPreparation_mentionId_fkey" FOREIGN KEY ("mentionId") REFERENCES "IngredientMention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentionPreparation" ADD CONSTRAINT "MentionPreparation_preparationId_fkey" FOREIGN KEY ("preparationId") REFERENCES "PreparationOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentionModifier" ADD CONSTRAINT "MentionModifier_mentionId_fkey" FOREIGN KEY ("mentionId") REFERENCES "IngredientMention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discovery" ADD CONSTRAINT "Discovery_resolvedByDecisionId_fkey" FOREIGN KEY ("resolvedByDecisionId") REFERENCES "LexiconDecision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryEvidence" ADD CONSTRAINT "DiscoveryEvidence_discoveryId_fkey" FOREIGN KEY ("discoveryId") REFERENCES "Discovery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryEvidence" ADD CONSTRAINT "DiscoveryEvidence_mentionId_fkey" FOREIGN KEY ("mentionId") REFERENCES "IngredientMention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexiconDecision" ADD CONSTRAINT "LexiconDecision_discoveryId_fkey" FOREIGN KEY ("discoveryId") REFERENCES "Discovery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexiconDecision" ADD CONSTRAINT "LexiconDecision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexiconDecision" ADD CONSTRAINT "LexiconDecision_revision_fkey" FOREIGN KEY ("revision") REFERENCES "LexiconRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexiconDecision" ADD CONSTRAINT "LexiconDecision_revertedById_fkey" FOREIGN KEY ("revertedById") REFERENCES "LexiconDecision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptMergeRecord" ADD CONSTRAINT "ConceptMergeRecord_survivorId_fkey" FOREIGN KEY ("survivorId") REFERENCES "FoodConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptMergeRecord" ADD CONSTRAINT "ConceptMergeRecord_mergedId_fkey" FOREIGN KEY ("mergedId") REFERENCES "FoodConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptMergeRecord" ADD CONSTRAINT "ConceptMergeRecord_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "LexiconDecision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegacyIngredientMapping" ADD CONSTRAINT "LegacyIngredientMapping_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "FoodConcept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FoodConceptToIngredientTag" ADD CONSTRAINT "_FoodConceptToIngredientTag_A_fkey" FOREIGN KEY ("A") REFERENCES "FoodConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FoodConceptToIngredientTag" ADD CONSTRAINT "_FoodConceptToIngredientTag_B_fkey" FOREIGN KEY ("B") REFERENCES "IngredientTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Constraints Prisma cannot express. `prisma db push` would drop these; schema
-- changes go through migrations only.
-- ---------------------------------------------------------------------------

-- Each lexicon entry points at exactly the kind of target its role needs (decision D4).
ALTER TABLE "LexiconEntry" ADD CONSTRAINT "LexiconEntry_role_target_check" CHECK (
  (role = 'FOOD' AND "conceptId" IS NOT NULL AND "attributeValueId" IS NULL AND "preparationId" IS NULL AND "valueKey" IS NULL)
  OR (role = 'ATTRIBUTE' AND "attributeValueId" IS NOT NULL AND "conceptId" IS NULL AND "preparationId" IS NULL AND "valueKey" IS NULL)
  OR (role = 'PREPARATION' AND "preparationId" IS NOT NULL AND "conceptId" IS NULL AND "attributeValueId" IS NULL AND "valueKey" IS NULL)
  OR (role IN ('DEGREE', 'MEASUREMENT_MODIFIER', 'INSTRUCTION') AND "valueKey" IS NOT NULL AND "conceptId" IS NULL AND "attributeValueId" IS NULL AND "preparationId" IS NULL)
);

-- Term kinds (CANONICAL, PLURAL, ...) only describe FOOD entries.
ALTER TABLE "LexiconEntry" ADD CONSTRAINT "LexiconEntry_kind_food_only_check" CHECK (kind IS NULL OR role = 'FOOD');

-- No self-references.
ALTER TABLE "FoodRelationship" ADD CONSTRAINT "FoodRelationship_not_self_check" CHECK ("sourceId" <> "targetId");
ALTER TABLE "FoodSubstitution" ADD CONSTRAINT "FoodSubstitution_not_self_check" CHECK ("fromConceptId" <> "toConceptId");
ALTER TABLE "ConceptMergeRecord" ADD CONSTRAINT "ConceptMergeRecord_not_self_check" CHECK ("survivorId" <> "mergedId");

-- Review queue: open discoveries, highest priority first.
CREATE INDEX "discovery_open_priority" ON "Discovery" (priority DESC) WHERE status = 'OPEN';
