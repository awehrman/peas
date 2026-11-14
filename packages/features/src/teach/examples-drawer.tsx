"use client";

import { HighlightedLine } from "./highlighted-line";
import type { DiscoveryExample } from "./types";

import { type ReactNode, useCallback, useEffect, useState } from "react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@peas/components";

import { AppLink } from "../app-navigation";

const PAGE_SIZE = 20;

/**
 * "Show me other examples": up to 20 mentions at a time, with links to their notes.
 *
 * @example
 * <ExamplesDrawer open={open} onOpenChange={setOpen} title="calamansi juice" total={9} onLoad={(offset) => loadExamples(offset)} />
 */
export function ExamplesDrawer({
  open,
  onOpenChange,
  title,
  total,
  onLoad,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  total: number;
  onLoad: (offset: number, limit: number) => Promise<DiscoveryExample[]>;
}): ReactNode {
  const [examples, setExamples] = useState<DiscoveryExample[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hasRequested, setHasRequested] = useState(false);

  const load = useCallback(
    async (offset: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const page = await onLoad(offset, PAGE_SIZE);
        setExamples((current) => (offset === 0 ? page : [...current, ...page]));
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Could not load examples"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [onLoad]
  );

  useEffect(() => {
    if (!open || hasRequested) return;
    setHasRequested(true);
    void load(0);
  }, [open, hasRequested, load]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Examples of “{title}”</DialogTitle>
          <DialogDescription>
            {total} {total === 1 ? "mention" : "mentions"} across your notes.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2" aria-busy={isLoading}>
          {examples.map((example) => (
            <li
              key={example.mentionId}
              className="rounded-md bg-greyscale-50 p-2 text-sm"
            >
              <HighlightedLine text={example.lineText} marks={[example.span]} />
              {example.noteId ? (
                <div>
                  <AppLink
                    href={`/notes/${example.noteId}`}
                    className="text-xs text-primary hover:underline"
                  >
                    {example.noteTitle ?? "Open note"}
                  </AppLink>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        {error ? (
          <p role="alert" className="text-sm text-error-700">
            {error}
          </p>
        ) : null}
        {examples.length < total ? (
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={() => void load(examples.length)}
          >
            {isLoading ? "Loading…" : "Load more"}
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
