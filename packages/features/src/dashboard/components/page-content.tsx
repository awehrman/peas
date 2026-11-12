"use client";

import type { ReactNode } from "react";

import { Button, Placeholder, Progress } from "@peas/components";
import { NotebookPen } from "lucide-react";

import { AppLink } from "../../app-navigation";
import type { DashboardStats } from "../types";
import { type CleanupAllDataResult, CleanupCard } from "./cleanup-card";
import {
  RankedList,
  StackedBar,
  StatCard,
  StatTile,
  YearChart,
  formatCount,
  formatPercent,
} from "./stat-charts";

interface DashboardPageContentProps {
  stats: DashboardStats;
  /** Only provided for admins; the cleanup card is hidden without it */
  onCleanupAllData?: () => Promise<CleanupAllDataResult>;
}

export function DashboardPageContent({
  stats,
  onCleanupAllData,
}: DashboardPageContentProps): ReactNode {
  const adminTools = onCleanupAllData ? (
    <div className="md:w-1/3">
      <CleanupCard onCleanupAllData={onCleanupAllData} />
    </div>
  ) : null;

  if (stats.noteCount === 0) {
    return (
      <div className="flex flex-col gap-6">
        <Placeholder
          label="No notes yet. Import an Evernote export to see stats about your recipes."
          icon={<NotebookPen />}
          button={
            <Button asChild>
              <AppLink href="/import">Import notes</AppLink>
            </Button>
          }
        />
        {adminTools}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <OverviewTiles stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ImportStatusCard stats={stats} />
        <ParsingQualityCard stats={stats} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Most-used ingredients"
          description="By ingredient lines that mention them"
        >
          <RankedList
            label="Most-used ingredients"
            unit={["line", "lines"]}
            emptyLabel="No ingredients have been linked to lines yet."
            items={stats.topIngredients.map((ingredient) => ({
              key: ingredient.ingredientId,
              label: ingredient.name,
              count: ingredient.lineCount,
              href: `/ingredients?id=${encodeURIComponent(ingredient.ingredientId)}`,
            }))}
          />
        </StatCard>
        <StatCard title="Top sources" description="Websites you save from most">
          <RankedList
            label="Top sources"
            unit={["recipe", "recipes"]}
            emptyLabel="No source websites recorded yet."
            items={toRankedItems(stats.topSources)}
          />
        </StatCard>
        <StatCard title="Top categories" description="By number of notes">
          <RankedList
            label="Top categories"
            unit={["note", "notes"]}
            emptyLabel="No categories yet."
            items={toRankedItems(stats.topCategories)}
          />
        </StatCard>
        <StatCard title="Top tags" description="By number of notes">
          <RankedList
            label="Top tags"
            unit={["note", "notes"]}
            emptyLabel="No tags yet."
            items={toRankedItems(stats.topTags)}
          />
        </StatCard>
      </div>

      {stats.notesBySavedYear.length > 0 ? (
        <StatCard
          title="Recipes saved by year"
          description="When each note was first saved in Evernote"
        >
          <YearChart
            label="Notes saved per year"
            years={stats.notesBySavedYear}
          />
        </StatCard>
      ) : null}

      {adminTools}
    </div>
  );
}

function OverviewTiles({ stats }: { stats: DashboardStats }): ReactNode {
  const { ingredientLines } = stats;
  const linesPerNote = Math.round(ingredientLines.total / stats.noteCount);

  return (
    <section
      aria-label="Overview"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <StatTile
        label="Notes"
        value={stats.noteCount}
        detail={`${formatCount(stats.notesByStatus.completed)} imported successfully`}
      />
      <StatTile
        label="Recipes"
        value={stats.recipeCount}
        detail={
          stats.notesReadyToPromote > 0 ? (
            <AppLink href="/recipes" className="hover:underline">
              {formatCount(stats.notesReadyToPromote)}{" "}
              {stats.notesReadyToPromote === 1 ? "note" : "notes"} ready to
              become recipes
            </AppLink>
          ) : (
            "Every completed note is a recipe"
          )
        }
      />
      <StatTile
        label="Ingredients"
        value={stats.ingredientCount}
        detail={
          <div className="flex flex-col gap-1.5 pt-1">
            <Progress
              value={percentValue(
                stats.reviewedIngredientCount,
                stats.ingredientCount
              )}
              aria-label="Ingredients reviewed"
            />
            <AppLink
              href="/ingredients?view=unreviewed"
              className="hover:underline"
            >
              {formatPercent(
                stats.reviewedIngredientCount,
                stats.ingredientCount
              )}{" "}
              reviewed
            </AppLink>
          </div>
        }
      />
      <StatTile
        label="Ingredient lines"
        value={ingredientLines.total}
        detail={`About ${formatCount(linesPerNote)} per note · ${formatCount(stats.instructionLineCount)} instruction steps`}
      />
    </section>
  );
}

function ImportStatusCard({ stats }: { stats: DashboardStats }): ReactNode {
  const { notesByStatus } = stats;
  const needsAttention = notesByStatus.failed + notesByStatus.duplicate;

  return (
    <StatCard
      title="Import status"
      description={
        needsAttention > 0
          ? `${formatCount(needsAttention)} ${needsAttention === 1 ? "note needs" : "notes need"} a look`
          : "Every note imported cleanly"
      }
    >
      <StackedBar
        label="Notes by import status"
        segments={[
          {
            label: "Completed",
            count: notesByStatus.completed,
            colorClassName: "bg-primary-500",
            href: "/notes?status=COMPLETED",
          },
          {
            label: "Processing",
            count: notesByStatus.processing,
            colorClassName: "bg-secondary-400",
            href: "/notes?status=PROCESSING",
          },
          {
            label: "Pending",
            count: notesByStatus.pending,
            colorClassName: "bg-greyscale-300",
            href: "/notes?status=PENDING",
          },
          {
            label: "Duplicate",
            count: notesByStatus.duplicate,
            colorClassName: "bg-warning-400",
            href: "/notes?status=DUPLICATE",
          },
          {
            label: "Failed",
            count: notesByStatus.failed,
            colorClassName: "bg-error-500",
            href: "/notes?status=FAILED",
          },
        ]}
      />
    </StatCard>
  );
}

function ParsingQualityCard({ stats }: { stats: DashboardStats }): ReactNode {
  const lines = stats.ingredientLines;
  const parsedLines = lines.parsedSuccessfully + lines.parsedWithErrors;
  const reviewedLines = lines.markedCorrect + lines.markedIncorrect;

  return (
    <StatCard
      title="Parsing quality"
      description={`${formatPercent(lines.parsedSuccessfully, parsedLines)} of parsed ingredient lines parsed without errors`}
    >
      <div className="flex flex-col gap-5">
        <StackedBar
          label="Ingredient lines by parse result"
          segments={[
            {
              label: "Parsed",
              count: lines.parsedSuccessfully,
              colorClassName: "bg-primary-500",
            },
            {
              label: "Errors",
              count: lines.parsedWithErrors,
              colorClassName: "bg-error-500",
            },
            {
              label: "Waiting",
              count: lines.awaitingParsing,
              colorClassName: "bg-greyscale-300",
            },
          ]}
        />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span>Lines reviewed</span>
            <span className="tabular-nums text-muted-foreground">
              {formatCount(reviewedLines)} of {formatCount(lines.total)}
            </span>
          </div>
          <Progress
            value={percentValue(reviewedLines, lines.total)}
            aria-label="Ingredient lines reviewed"
          />
          <p className="text-xs text-muted-foreground">
            {reviewedLines > 0
              ? `${formatPercent(lines.markedCorrect, reviewedLines)} of reviewed lines were parsed correctly`
              : "Mark lines correct or incorrect on a note to track parser accuracy"}
          </p>
        </div>
      </div>
    </StatCard>
  );
}

function toRankedItems(items: DashboardStats["topSources"]) {
  return items.map((item) => ({ key: item.label, ...item }));
}

function percentValue(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}
