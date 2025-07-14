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
    const sinceTime = searchParams.get("sinceTime");

    const cacheKey = getCacheKey(since ?? sinceTime ?? undefined);
    const cached = getCachedData(cacheKey);

    if (cached) {
      return NextResponse.json(cached);
    }

    const whereClause: any = {};

    if (since) {
      // For polling, get events newer than the since ID
      whereClause.id = { gt: since };
    } else if (sinceTime) {
      // For polling, get events newer than the since time
      whereClause.createdAt = { gt: new Date(parseInt(sinceTime)) };
    } else {
      // For initial load, get recent events (last 24h)
      whereClause.createdAt = {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      };
    }

    console.log(
      "🔍 API: Querying status events with whereClause:",
      JSON.stringify(whereClause, null, 2)
    );

    const statusEvents = await prisma.noteStatusEvent.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
      take: 25,
      include: { note: { select: { title: true } } },
    });

    console.log("🔍 API: Found status events:", statusEvents.length);
    if (statusEvents.length > 0) {
      const firstEvent = statusEvents[0];
      const lastEvent = statusEvents[statusEvents.length - 1];
      console.log("🔍 API: First event:", {
        id: firstEvent?.id,
        context: firstEvent?.context,
        message: firstEvent?.errorMessage,
        createdAt: firstEvent?.createdAt,
      });
      console.log("🔍 API: Last event:", {
        id: lastEvent?.id,
        context: lastEvent?.context,
        message: lastEvent?.errorMessage,
        createdAt: lastEvent?.createdAt,
      });
    } else {
      // Check if there are ANY status events in the database
      const totalCount = await prisma.noteStatusEvent.count();
      console.log(
        "🔍 API: No events found with current query. Total events in DB:",
        totalCount
      );

      if (totalCount > 0) {
        // Get the most recent event to see what's there
        const mostRecent = await prisma.noteStatusEvent.findFirst({
          orderBy: { createdAt: "desc" },
          include: { note: { select: { title: true } } },
        });
        console.log("🔍 API: Most recent event in DB:", {
          id: mostRecent?.id,
          context: mostRecent?.context,
          message: mostRecent?.errorMessage,
          createdAt: mostRecent?.createdAt,
          noteTitle: mostRecent?.note?.title,
        });
      }
    }

    const items = statusEvents.map((ev) => {
      // Default indent level based on context
      let indentLevel = 0;
      if (ev.context?.includes("ingredient")) indentLevel = 1;
      if (ev.context?.includes("instruction")) indentLevel = 1;

      const text =
        ev.errorMessage ??
        ev.context ??
        `Status ${ev.status} for note "${ev.note?.title ?? ev.noteId}"`;

      return {
        text,
        indentLevel,
        id: ev.id,
        status: ev.status,
        message: ev.errorMessage, // Map errorMessage to message for client
        context: ev.context,
        errorMessage: ev.errorMessage,
        note: ev.note,
      } as const;
    });

    const result = {
      items,
      lastEventId:
        statusEvents.length > 0
          ? statusEvents[statusEvents.length - 1]?.id
          : undefined,
    };
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
