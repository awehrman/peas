import { prisma } from "../client";

/**
 * Find or create a parsing rule by name
 */
export async function findOrCreateParsingRule(
  ruleName: string
): Promise<{ id: string; name: string; isNew: boolean }> {
  const maxRetries = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        // First, try to find the existing rule
        let rule = await tx.parsingRule.findUnique({
          where: { name: ruleName },
        });

        if (rule) {
          return { id: rule.id, name: rule.name, isNew: false };
        }

        // If not found, create it
        try {
          rule = await tx.parsingRule.create({
            data: {
              name: ruleName,
            },
          });
          return { id: rule.id, name: rule.name, isNew: true };
        } catch (error) {
          // If creation fails due to race condition, try to find it again
          if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P2002"
          ) {
            rule = await tx.parsingRule.findUnique({
              where: { name: ruleName },
            });

            if (rule) {
              return { id: rule.id, name: rule.name, isNew: false };
            }
          }

          // Re-throw if it's not a unique constraint violation or if we still can't find the rule
          throw error;
        }
      });
    } catch (error) {
      lastError = error;

      // Log the error for debugging
      console.error(
        `Error in findOrCreateParsingRule for rule "${ruleName}" (attempt ${attempt}/${maxRetries}):`,
        error
      );

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }

      // If it's a transaction abort error, wait a bit before retrying
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string" &&
        error.message.includes("current transaction is aborted")
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt)); // Exponential backoff
        continue;
      }

      // For other errors, don't retry
      throw error;
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError;
}

/**
 * Get parsing rule by ID
 */
export async function getParsingRuleById(
  ruleId: string
): Promise<{ id: string; name: string } | null> {
  return prisma.parsingRule.findUnique({
    where: { id: ruleId },
    select: {
      id: true,
      name: true,
    },
  });
}

/**
 * Get parsing rule by name
 */
export async function getParsingRuleByName(
  ruleName: string
): Promise<{ id: string; name: string } | null> {
  return prisma.parsingRule.findUnique({
    where: { name: ruleName },
    select: {
      id: true,
      name: true,
    },
  });
}

/**
 * Get all parsing rules
 */
export async function getAllParsingRules(): Promise<
  Array<{
    id: string;
    name: string;
  }>
> {
  return prisma.parsingRule.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });
}

/**
 * Find orphaned parsing rules (those with no connected parsed segments)
 */
export async function findOrphanedParsingRules(): Promise<
  Array<{
    id: string;
    name: string;
    createdAt: Date;
    segmentCount: number;
  }>
> {
  return prisma.parsingRule
    .findMany({
      where: {
        parsedSegments: {
          none: {},
        },
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            parsedSegments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    .then((rules) =>
      rules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        createdAt: rule.createdAt,
        segmentCount: rule._count.parsedSegments,
      }))
    );
}

/**
 * Delete orphaned parsing rules (those with no connected parsed segments)
 */
export async function deleteOrphanedParsingRules(): Promise<{
  deletedCount: number;
  deletedRules: Array<{ id: string; name: string }>;
}> {
  const orphanedRules = await findOrphanedParsingRules();

  if (orphanedRules.length === 0) {
    return { deletedCount: 0, deletedRules: [] };
  }

  const deletedRules = await prisma.parsingRule.deleteMany({
    where: {
      id: {
        in: orphanedRules.map((rule) => rule.id),
      },
    },
  });

  return {
    deletedCount: deletedRules.count,
    deletedRules: orphanedRules.map((rule) => ({
      id: rule.id,
      name: rule.name,
    })),
  };
}

/**
 * Get parsing rule usage count
 */
export async function getParsingRuleUsageCount(
  ruleId: string
): Promise<number> {
  const count = await prisma.parsedSegment.count({
    where: { ruleId },
  });
  return count;
}
