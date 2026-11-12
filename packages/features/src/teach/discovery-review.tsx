"use client";

import {
  DecisionOptions,
  decisionOptionsFor,
  initialPayload,
} from "./decision-options";
import { ExamplesDrawer } from "./examples-drawer";
import { HighlightedLine } from "./highlighted-line";
import { ImpactPreview } from "./impact-preview";
import {
  type ApplyDecisionResult,
  DISCOVERY_TYPE_LABELS,
  type DecisionPayload,
  type DecisionPreview,
  type DiscoveryExample,
  type PreviewDecision,
  type SearchConcepts,
  type TeachDiscovery,
  type TeachVocabulary,
} from "./types";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Badge, Button } from "@peas/components";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

import { AppLink, useAppNavigation } from "../app-navigation";
import { InlineError, type MutationAction, useMutation } from "../shared";

const PREVIEW_DEBOUNCE_MS = 300;

export interface DiscoveryReviewProps {
  discovery: TeachDiscovery;
  examples: DiscoveryExample[];
  vocabulary: TeachVocabulary;
  previousId: string | null;
  nextId: string | null;
  /** Confirmation from the previous card ("Taught: …; 12 mentions updated"). */
  taughtMessage?: string | null;
  onApplyDecision?: MutationAction<
    [payload: DecisionPayload, discoveryId: string],
    ApplyDecisionResult
  >;
  onDefer?: MutationAction<[discoveryId: string]>;
  onPreviewDecision: PreviewDecision;
  onSearchConcepts: SearchConcepts;
  onLoadExamples: (
    offset: number,
    limit: number
  ) => Promise<DiscoveryExample[]>;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) &&
      !(target instanceof HTMLInputElement && target.type === "radio"))
  );
}

function teachHref(id: string | null, message: string): string {
  const query = `?taught=${encodeURIComponent(message)}`;
  return id ? `/teach/${id}${query}` : `/teach${query}`;
}

/**
 * The focused review card (Phase 4f): the discovery, its examples, the decision options, and the live impact preview. Keyboard: `j`/`k` next and previous, `1`-`9` pick an option, `e` examples, `Enter` apply, `d` defer; shortcuts pause while typing in a field.
 */
export function DiscoveryReviewPageContent({
  discovery,
  examples,
  vocabulary,
  previousId,
  nextId,
  taughtMessage,
  onApplyDecision,
  onDefer,
  onPreviewDecision,
  onSearchConcepts,
  onLoadExamples,
}: DiscoveryReviewProps): ReactNode {
  const { push } = useAppNavigation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const options = useMemo(
    () => decisionOptionsFor(discovery, vocabulary, onSearchConcepts),
    [discovery, vocabulary, onSearchConcepts]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [payload, setPayload] = useState<DecisionPayload | null>(() =>
    initialPayload(options)
  );
  const [preview, setPreview] = useState<DecisionPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const apply = useMutation(onApplyDecision);
  const defer = useMutation(onDefer);

  useEffect(() => {
    headingRef.current?.focus();
  }, [discovery.id]);

  useEffect(() => {
    if (!payload) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    let isCancelled = false;
    setIsPreviewing(true);
    const timeout = setTimeout(() => {
      onPreviewDecision(payload)
        .then((result) => {
          if (isCancelled) return;
          setPreview(result);
          setPreviewError(null);
        })
        .catch((caught: unknown) => {
          if (!isCancelled)
            setPreviewError(
              caught instanceof Error
                ? caught.message
                : "Could not preview this decision"
            );
        })
        .finally(() => {
          if (!isCancelled) setIsPreviewing(false);
        });
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [payload, onPreviewDecision]);

  const handleApply = useCallback(async () => {
    if (!payload || apply.isPending) return;
    const result = await apply.run(payload, discovery.id);
    if (!result.success || !result.data) return;
    const {
      summary,
      mentionsUpdated,
      needsBackgroundReinterpret,
      reinterpretCommand,
    } = result.data;
    const message = needsBackgroundReinterpret
      ? `${summary}; many mentions are affected, run: ${reinterpretCommand ?? "yarn workspace @peas/queue reinterpret"}`
      : `${summary}; ${mentionsUpdated} ${mentionsUpdated === 1 ? "mention" : "mentions"} updated`;
    push(teachHref(nextId, message));
  }, [apply, discovery.id, nextId, payload, push]);

  const handleDefer = useCallback(async () => {
    if (defer.isPending) return;
    const result = await defer.run(discovery.id);
    if (result.success)
      push(teachHref(nextId, `Deferred “${discovery.title}”`));
  }, [defer, discovery.id, discovery.title, nextId, push]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        examplesOpen ||
        isTyping(event.target)
      )
        return;
      if (event.key === "j" && nextId) push(`/teach/${nextId}`);
      else if (event.key === "k" && previousId) push(`/teach/${previousId}`);
      else if (event.key === "e") setExamplesOpen(true);
      else if (event.key === "d" && onDefer) void handleDefer();
      else if (
        event.key === "Enter" &&
        !(
          event.target instanceof HTMLButtonElement ||
          event.target instanceof HTMLAnchorElement
        )
      ) {
        event.preventDefault();
        void handleApply();
      } else if (/^[1-9]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        if (index < options.length) setSelectedIndex(index);
      } else return;
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    examplesOpen,
    handleApply,
    handleDefer,
    nextId,
    onDefer,
    options.length,
    previousId,
    push,
  ]);

  return (
    <article className="flex max-w-5xl flex-col gap-6">
      <AppLink
        href="/teach"
        className="inline-flex items-center gap-1 text-sm text-greyscale-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Review queue
      </AppLink>

      {taughtMessage ? (
        <p
          role="status"
          className="rounded-md bg-success-50 px-3 py-2 text-sm text-success-900"
        >
          {taughtMessage}
        </p>
      ) : null}

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-greyscale-700">
          <Badge variant="secondary">
            {DISCOVERY_TYPE_LABELS[discovery.type]}
          </Badge>
          <span>
            {discovery.mentionCount}{" "}
            {discovery.mentionCount === 1 ? "mention" : "mentions"} in{" "}
            {discovery.distinctNoteCount}{" "}
            {discovery.distinctNoteCount === 1 ? "note" : "notes"}
          </span>
        </div>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold text-greyscale-900 outline-none"
        >
          {discovery.title}
        </h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-6">
          <section
            aria-labelledby="examples-heading"
            className="flex flex-col gap-2"
          >
            <h2
              id="examples-heading"
              className="text-base font-semibold text-greyscale-900"
            >
              Where it appears
            </h2>
            {examples.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {examples.map((example) => (
                  <li
                    key={example.mentionId}
                    className="rounded-md bg-greyscale-50 p-2 text-sm"
                  >
                    <HighlightedLine
                      text={example.lineText}
                      marks={[example.span]}
                    />
                    {example.noteTitle ? (
                      <span className="ml-2 text-xs text-greyscale-600">
                        ({example.noteTitle})
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-greyscale-600">
                No stored mentions show this yet.
              </p>
            )}
            {discovery.mentionCount > examples.length ? (
              <Button
                type="button"
                variant="outline"
                className="self-start"
                onClick={() => setExamplesOpen(true)}
              >
                Show me other examples{" "}
                <kbd className="ml-2 text-xs" aria-hidden="true">
                  e
                </kbd>
              </Button>
            ) : null}
          </section>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleApply();
            }}
            className="flex flex-col gap-4"
          >
            <DecisionOptions
              discovery={discovery}
              options={options}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              onPayloadChange={setPayload}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                disabled={!payload || apply.isPending || !onApplyDecision}
              >
                {apply.isPending ? "Teaching…" : "Apply"}{" "}
                <kbd className="ml-2 text-xs" aria-hidden="true">
                  Enter
                </kbd>
              </Button>
              {onDefer ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={defer.isPending}
                  onClick={() => void handleDefer()}
                >
                  Defer{" "}
                  <kbd className="ml-2 text-xs" aria-hidden="true">
                    d
                  </kbd>
                </Button>
              ) : null}
            </div>
            <InlineError message={apply.error ?? defer.error} />
          </form>
        </div>

        <ImpactPreview
          preview={preview}
          isLoading={isPreviewing}
          error={previewError}
        />
      </div>

      <nav
        aria-label="Review navigation"
        className="flex items-center justify-between gap-2 border-t border-greyscale-200 pt-4 text-sm"
      >
        {previousId ? (
          <AppLink
            href={`/teach/${previousId}`}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous{" "}
            <kbd className="text-xs" aria-hidden="true">
              k
            </kbd>
          </AppLink>
        ) : (
          <span />
        )}
        <p className="text-xs text-greyscale-600">
          Shortcuts: j/k move, 1–9 choose, e examples, Enter apply, d defer
        </p>
        {nextId ? (
          <AppLink
            href={`/teach/${nextId}`}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Skip{" "}
            <kbd className="text-xs" aria-hidden="true">
              j
            </kbd>{" "}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </AppLink>
        ) : (
          <span />
        )}
      </nav>

      <ExamplesDrawer
        open={examplesOpen}
        onOpenChange={setExamplesOpen}
        title={discovery.title}
        total={discovery.mentionCount}
        onLoad={onLoadExamples}
      />
    </article>
  );
}
