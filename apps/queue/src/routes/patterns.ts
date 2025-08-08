import { Router } from "express";
import { z } from "zod";
import { getPatternStatistics, getPatternsWithIngredientLines, getIngredientLinesByPattern, getUnlinkedIngredientLines, prisma } from "@peas/database";
import { validateQuery } from "../middleware/validation";
import { ErrorHandler } from "../utils/error-handler";

const router = Router();

// Helper function to safely parse numeric query parameters
function safeParseInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? undefined : parsed;
}

// Get pattern statistics
router.get("/stats", async (req, res) => {
  try {
    const stats = await getPatternStatistics(prisma);
    res.json(stats);
  } catch (error) {
    const errorResponse = ErrorHandler.handleRouteError(error, "get-pattern-stats");
    res.status(500).json(errorResponse);
  }
});

// Get unlinked ingredient lines - must come before /:patternId/lines to avoid conflicts
router.get("/unlinked/lines", validateQuery(z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
  noteId: z.string().optional(),
})), async (req, res) => {
  try {
    const { limit, offset, noteId } = req.query;
    
    const lines = await getUnlinkedIngredientLines(prisma, {
      limit: safeParseInt(limit as string),
      offset: safeParseInt(offset as string),
      noteId: noteId as string,
    });
    
    res.json(lines);
  } catch (error) {
    const errorResponse = ErrorHandler.handleRouteError(error, "get-unlinked-lines");
    res.status(500).json(errorResponse);
  }
});

// Get patterns with pagination
router.get("/", validateQuery(z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
  minOccurrenceCount: z.string().optional(),
  noteId: z.string().optional(),
})), async (req, res) => {
  try {
    const { limit, offset, minOccurrenceCount, noteId } = req.query;
    
    const patterns = await getPatternsWithIngredientLines(prisma, {
      limit: safeParseInt(limit as string),
      offset: safeParseInt(offset as string),
      minOccurrenceCount: safeParseInt(minOccurrenceCount as string),
      noteId: noteId as string,
    });
    
    res.json(patterns);
  } catch (error) {
    const errorResponse = ErrorHandler.handleRouteError(error, "get-patterns");
    res.status(500).json(errorResponse);
  }
});

// Get ingredient lines for a specific pattern
router.get("/:patternId/lines", validateQuery(z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
  noteId: z.string().optional(),
})), async (req, res) => {
  try {
    const { patternId } = req.params;
    
    // Validate pattern ID
    if (!patternId || patternId === "null" || patternId === "undefined" || patternId.trim() === "") {
      return res.status(400).json({ error: "Pattern ID is required" });
    }
    
    const { limit, offset, noteId } = req.query;
    
    const lines = await getIngredientLinesByPattern(prisma, patternId, {
      limit: safeParseInt(limit as string),
      offset: safeParseInt(offset as string),
      noteId: noteId as string,
    });
    
    res.json(lines);
  } catch (error) {
    const errorResponse = ErrorHandler.handleRouteError(error, "get-pattern-lines");
    res.status(500).json(errorResponse);
  }
});

export default router;
