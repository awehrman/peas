import { Router } from "express";

import { ManagerFactory } from "../config/factory";
import { CachedIngredientParser } from "../services/ingredient/cached-ingredient-parser";
import { HttpStatus } from "../types";
import { actionCache } from "../workers/core/cache/action-cache";

const cacheRouter = Router();

// ============================================================================
// CACHE STATISTICS ENDPOINTS
// ============================================================================

/**
 * GET /cache/stats
 * Get cache statistics and performance metrics
 */
cacheRouter.get("/stats", async (req, res) => {
  try {
    const actionCacheStats = actionCache.getStats();
    const cacheManager = ManagerFactory.createCacheManager();
    const redisStats = cacheManager.getStats();

    const stats = {
      actionCache: {
        memorySize: actionCacheStats.memorySize,
        memoryKeys: actionCacheStats.memoryKeys.slice(0, 10), // Show first 10 keys
        totalMemoryKeys: actionCacheStats.memoryKeys.length,
      },
      redis: {
        hits: redisStats.hits,
        misses: redisStats.misses,
        keys: redisStats.keys,
        hitRate: cacheManager.getHitRate(),
        lastReset: redisStats.lastReset,
      },
      performance: {
        totalHits: redisStats.hits + actionCacheStats.memorySize, // Approximate
        totalRequests: redisStats.hits + redisStats.misses,
        overallHitRate:
          ((redisStats.hits + actionCacheStats.memorySize) /
            (redisStats.hits + redisStats.misses)) *
          100,
      },
    };

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to get cache stats:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Failed to retrieve cache statistics",
    });
  }
});

/**
 * POST /cache/clear
 * Clear all caches
 */
cacheRouter.post("/clear", async (req, res) => {
  try {
    await actionCache.clearAll();

    res.json({
      success: true,
      message: "All caches cleared successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to clear caches:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Failed to clear caches",
    });
  }
});

/**
 * POST /cache/invalidate
 * Invalidate cache by pattern
 */
cacheRouter.post("/invalidate", async (req, res) => {
  try {
    const { pattern } = req.body;

    if (!pattern || typeof pattern !== "string") {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: "Pattern is required and must be a string",
      });
    }

    const clearedCount = await actionCache.invalidateByPattern(pattern);

    res.json({
      success: true,
      message: `Invalidated ${clearedCount} cache entries matching pattern: ${pattern}`,
      clearedCount,
      pattern,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to invalidate cache:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Failed to invalidate cache",
    });
  }
});

/**
 * GET /cache/keys
 * Get cache keys by pattern (for debugging)
 */
cacheRouter.get("/keys", async (req, res) => {
  try {
    const { pattern = "*" } = req.query;

    /* istanbul ignore next -- @preserve */
    if (typeof pattern !== "string") {
      /* istanbul ignore next -- @preserve */
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: "Pattern must be a string",
      });
    }

    const actionCacheStats = actionCache.getStats();
    const matchingKeys = actionCacheStats.memoryKeys.filter(
      (key) => pattern === "*" || key.includes(pattern)
    );

    res.json({
      success: true,
      data: {
        pattern,
        keys: matchingKeys.slice(0, 50), // Limit to 50 keys
        totalKeys: matchingKeys.length,
        totalMemoryKeys: actionCacheStats.memoryKeys.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to get cache keys:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Failed to retrieve cache keys",
    });
  }
});

/**
 * DELETE /cache/keys/:key
 * Delete a specific cache key
 */
cacheRouter.delete("/keys/:key", async (req, res) => {
  try {
    const { key } = req.params;

    /* istanbul ignore next -- @preserve */
    if (!key) {
      /* istanbul ignore next -- @preserve */
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: "Cache key is required",
      });
    }

    await actionCache.delete(key);

    res.json({
      success: true,
      message: `Cache key '${key}' deleted successfully`,
      key,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to delete cache key:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Failed to delete cache key",
    });
  }
});

/**
 * POST /cache/ingredient/parse
 * Test ingredient line parsing with caching
 */
cacheRouter.post("/ingredient/parse", async (req, res) => {
  try {
    const { lines, options = {} } = req.body;

    if (!lines || !Array.isArray(lines)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: "Lines array is required",
      });
    }

    const results = await CachedIngredientParser.parseIngredientLines(
      lines,
      options
    );

    res.json({
      success: true,
      data: {
        lines,
        results,
        totalLines: lines.length,
        cacheStats: CachedIngredientParser.getCacheStats(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to parse ingredient lines:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Failed to parse ingredient lines",
    });
  }
});

/**
 * GET /cache/ingredient/stats
 * Get ingredient parsing cache statistics
 */
cacheRouter.get("/ingredient/stats", async (req, res) => {
  try {
    const stats = CachedIngredientParser.getCacheStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to get ingredient cache stats:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Failed to get ingredient cache stats",
    });
  }
});

/**
 * POST /cache/ingredient/invalidate
 * Invalidate ingredient parsing cache
 */
cacheRouter.post("/ingredient/invalidate", async (req, res) => {
  try {
    const { pattern } = req.body;

    const clearedCount =
      await CachedIngredientParser.invalidateIngredientCache(pattern);

    res.json({
      success: true,
      message: `Invalidated ${clearedCount} ingredient cache entries${pattern ? ` matching pattern: ${pattern}` : ""}`,
      clearedCount,
      pattern,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to invalidate ingredient cache:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Failed to invalidate ingredient cache",
    });
  }
});

/**
 * Reset memory cache only
 */
cacheRouter.post("/reset-memory", async (req, res) => {
  try {
    actionCache.resetMemoryCache();
    res.json({
      success: true,
      message: "Memory cache reset successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to reset memory cache",
      /* istanbul ignore next -- @preserve */
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export { cacheRouter };
