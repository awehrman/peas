import type { StructuredLogger } from "../../../../types";
import type { PatternAnalysisJobData } from "../../../../workers/pattern-tracking/dependencies";

export interface PatternAnalysisResult {
  patternId: string;
  ruleIds: string[];
  exampleLine?: string;
  occurrenceCount: number;
  ingredientLines: Array<{
    id: string;
    reference: string;
    lineIndex: number;
    noteId?: string;
    createdAt: Date;
  }>;
  analysis: {
    totalLines: number;
    uniqueNotes: number;
    mostCommonIngredients: Array<{
      ingredient: string;
      count: number;
    }>;
    averageLineLength: number;
    patternComplexity: "simple" | "moderate" | "complex";
  };
}

export async function analyzePatterns(
  data: PatternAnalysisJobData,
  logger: StructuredLogger
): Promise<
  PatternAnalysisJobData & { analysisResults?: PatternAnalysisResult[] }
> {
  try {
    logger.log(
      `[ANALYZE_PATTERNS] Starting pattern analysis for job ${data.jobId}`
    );

    const { PatternTracker } = await import(
      "../../../../workers/shared/pattern-tracker"
    );
    const { prisma } = await import("@peas/database");

    const patternTracker = new PatternTracker(prisma, logger);

    // Get all patterns ordered by occurrence count
    const patterns = await patternTracker.getPatterns();
    const analysisResults: PatternAnalysisResult[] = [];

    // Analyze top patterns (limit to avoid performance issues)
    const topPatterns = patterns.slice(0, data.maxPatterns || 50);

    for (const pattern of topPatterns) {
      try {
        // Get pattern details with ingredient lines
        const patternWithLines =
          await patternTracker.getPatternWithIngredientLines(
            pattern.patternCode
          );

        if (patternWithLines) {
          const { pattern: patternData, ingredientLines } = patternWithLines;

          // Analyze ingredient lines
          const uniqueNotes = new Set(
            ingredientLines.map((line) => line.noteId).filter(Boolean)
          );
          const totalLines = ingredientLines.length;

          // Extract ingredients from references (simple approach)
          const ingredientCounts = new Map<string, number>();
          let totalLength = 0;

          for (const line of ingredientLines) {
            totalLength += line.reference.length;

            // Simple ingredient extraction (this could be enhanced)
            const words = line.reference.toLowerCase().split(/\s+/);
            for (const word of words) {
              if (word.length > 2 && !/^\d+$/.test(word)) {
                ingredientCounts.set(
                  word,
                  (ingredientCounts.get(word) || 0) + 1
                );
              }
            }
          }

          // Get top ingredients
          const mostCommonIngredients = Array.from(ingredientCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([ingredient, count]) => ({ ingredient, count }));

          // Determine pattern complexity
          let patternComplexity: "simple" | "moderate" | "complex";
          if (patternData.ruleIds.length <= 2) {
            patternComplexity = "simple";
          } else if (patternData.ruleIds.length <= 4) {
            patternComplexity = "moderate";
          } else {
            patternComplexity = "complex";
          }

          analysisResults.push({
            patternId: patternData.id,
            ruleIds: patternData.ruleIds,
            exampleLine: patternData.exampleLine,
            occurrenceCount: patternData.occurrenceCount,
            ingredientLines,
            analysis: {
              totalLines,
              uniqueNotes: uniqueNotes.size,
              mostCommonIngredients,
              averageLineLength:
                totalLines > 0 ? Math.round(totalLength / totalLines) : 0,
              patternComplexity,
            },
          });
        }
      } catch (patternError) {
        logger.log(
          `[ANALYZE_PATTERNS] Error analyzing pattern ${pattern.patternCode}: ${patternError}`
        );
        // Continue with other patterns
      }
    }

    logger.log(
      `[ANALYZE_PATTERNS] Completed analysis of ${analysisResults.length} patterns for job ${data.jobId}`
    );

    return {
      ...data,
      analysisResults,
      metadata: {
        ...data.metadata,
        analyzedAt: new Date().toISOString(),
        totalPatternsAnalyzed: analysisResults.length,
      },
    };
  } catch (error) {
    logger.log(
      `[ANALYZE_PATTERNS] Failed to analyze patterns for job ${data.jobId}: ${error}`
    );
    return {
      ...data,
      metadata: {
        ...data.metadata,
        error: error instanceof Error ? error.message : String(error),
        errorTimestamp: new Date().toISOString(),
      },
    };
  }
}
