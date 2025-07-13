import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@peas/database";

// Simple in-memory cache (for production, use Redis)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2000; // 2 seconds

function getCacheKey(since?: string): string {
  return `status-events-${since ?? "all"}`;
}

function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");

    const cacheKey = getCacheKey(since ?? undefined);
    const cached = getCachedData(cacheKey);

    if (cached) {
      return NextResponse.json(cached);
    }

    const whereClause: any = {
      createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) }, // last 12h
    };

    if (since) {
      whereClause.id = { gt: since };
    }

    const statusEvents = await prisma.noteStatusEvent.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
      take: 25,
      include: { note: { select: { title: true } } },
    });

    const items = statusEvents.map((ev) => {
      // Default indent level based on context
      let indentLevel = 0;
      if (ev.context?.includes("ingredient")) indentLevel = 1;
      if (ev.context?.includes("instruction")) indentLevel = 1;

      const text =
        ev.errorMessage ??
        ev.context ??
        `Status ${ev.status} for note "${ev.note.title ?? ev.noteId}"`;

      return { text, indentLevel, id: ev.id } as const;
    });

    const result = { items, lastEventId: statusEvents[0]?.id };
    setCachedData(cacheKey, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch status events:", error);
    return NextResponse.json(
      { error: "Failed to fetch status events" },
      { status: 500 }
    );
  }
}
