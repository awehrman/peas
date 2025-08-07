import { Router } from "express";
import { z } from "zod";
import { getPatternStatistics, getPatternsWithIngredientLines, getIngredientLinesByPattern, getUnlinkedIngredientLines, prisma } from "@peas/database";
import { validateQuery } from "../middleware/validation";
import { ErrorHandler } from "../utils/error-handler";

const router = Router();

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
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      minOccurrenceCount: minOccurrenceCount ? parseInt(minOccurrenceCount as string) : undefined,
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
    if (!patternId) {
      return res.status(400).json({ error: "Pattern ID is required" });
    }
    
    const { limit, offset, noteId } = req.query;
    
    const lines = await getIngredientLinesByPattern(prisma, patternId, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      noteId: noteId as string,
    });
    
    res.json(lines);
  } catch (error) {
    const errorResponse = ErrorHandler.handleRouteError(error, "get-pattern-lines");
    res.status(500).json(errorResponse);
  }
});

// Get unlinked ingredient lines
router.get("/unlinked/lines", validateQuery(z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
  noteId: z.string().optional(),
})), async (req, res) => {
  try {
    const { limit, offset, noteId } = req.query;
    
    const lines = await getUnlinkedIngredientLines(prisma, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      noteId: noteId as string,
    });
    
    res.json(lines);
  } catch (error) {
    const errorResponse = ErrorHandler.handleRouteError(error, "get-unlinked-lines");
    res.status(500).json(errorResponse);
  }
});

export default router;
