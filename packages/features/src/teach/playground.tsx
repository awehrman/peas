"use client";

import { RoleLegend } from "./highlighted-line";
import { ImpactPreview } from "./impact-preview";
import { MentionDetails, MentionStatusBadge } from "./mention-details";
import type {
  DecisionPayload,
  DecisionPreview,
  ParseMode,
  PlaygroundResult,
  PreviewDecision,
} from "./types";

import { type FormEvent, type ReactNode, useId, useState } from "react";

import { Button, Input, Label, Textarea } from "@peas/components";
import { ArrowLeft } from "lucide-react";

import { AppLink, useAppNavigation } from "../app-navigation";

export interface PlaygroundProps {
  line: string;
  mode: ParseMode;
  result: PlaygroundResult | null;
  onPreviewDecision: PreviewDecision;
}

const EXAMPLE_PAYLOAD = `{ "type": "IGNORE_TOKEN", "token": "good-quality" }`;

/**
 * Type a line and see how v2 reads it at the current lexicon revision: highlighted words, quantities, candidates with reasons, and the resolution. "Simulate decision" previews any decision payload without applying it.
 */
export function PlaygroundPageContent({
  line,
  mode,
  result,
  onPreviewDecision,
}: PlaygroundProps): ReactNode {
  const { push } = useAppNavigation();
  const inputId = useId();
  const payloadId = useId();
  const [draft, setDraft] = useState(line);
  const [draftMode, setDraftMode] = useState<ParseMode>(mode);
  const [payloadText, setPayloadText] = useState(EXAMPLE_PAYLOAD);
  const [preview, setPreview] = useState<DecisionPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  function handleRun(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams({ line: draft });
    if (draftMode !== "CONSERVATIVE") params.set("mode", draftMode);
    push(`/teach/playground?${params.toString()}`);
  }

  async function handleSimulate(event: FormEvent) {
    event.preventDefault();
    let payload: DecisionPayload;
    try {
      payload = JSON.parse(payloadText) as DecisionPayload;
    } catch {
      setPreviewError("The decision must be valid JSON");
      setPreview(null);
      return;
    }
    setIsPreviewing(true);
    setPreviewError(null);
    try {
      setPreview(await onPreviewDecision(payload));
    } catch (caught) {
      setPreview(null);
      setPreviewError(
        caught instanceof Error
          ? caught.message
          : "Could not preview this decision"
      );
    } finally {
      setIsPreviewing(false);
    }
  }

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <AppLink
        href="/teach"
        className="inline-flex items-center gap-1 text-sm text-greyscale-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Review queue
      </AppLink>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-greyscale-900">
          Parser playground
        </h1>
        <p className="text-sm text-greyscale-700">
          See how Peas reads an ingredient line with everything it has been
          taught so far.
        </p>
      </header>

      <form onSubmit={handleRun} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={inputId}>Ingredient line</Label>
          <Input
            id={inputId}
            value={draft}
            placeholder="1 lb boneless chicken thighs"
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>
        <fieldset className="flex flex-wrap items-center gap-4 text-sm">
          <legend className="sr-only">Parse mode</legend>
          {(["CONSERVATIVE", "EXPLORATORY"] as const).map((option) => (
            <label key={option} className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                checked={draftMode === option}
                onChange={() => setDraftMode(option)}
              />
              {option === "CONSERVATIVE"
                ? "Conservative (active entries)"
                : "Exploratory (with proposed entries)"}
            </label>
          ))}
        </fieldset>
        <Button type="submit" className="self-start" disabled={!draft.trim()}>
          Read line
        </Button>
      </form>

      {result ? (
        <section
          aria-labelledby="result-heading"
          className="flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2
              id="result-heading"
              className="text-lg font-semibold text-greyscale-900"
            >
              Result
            </h2>
            <span className="text-xs text-greyscale-600">
              Lexicon revision {result.revision}
              {result.alternativeCount > 0
                ? ` · ${result.alternativeCount} other segmentations considered`
                : ""}
            </span>
          </div>
          <RoleLegend />
          <p
            className="font-mono text-sm text-greyscale-800"
            aria-label="Syntax summary"
          >
            {result.syntax || "(empty)"}
          </p>
          <ol className="flex flex-col gap-3">
            {result.mentions.map((mention) => (
              <li
                key={`${mention.segmentIndex}-${mention.partIndex}`}
                className="flex flex-col gap-2 rounded-lg border border-greyscale-200 p-3"
              >
                <div className="flex items-center gap-2">
                  <MentionStatusBadge status={mention.status} />
                  <span className="text-sm text-greyscale-700">
                    Segment {mention.segmentIndex + 1}
                    {mention.partIndex > 0
                      ? `, part ${mention.partIndex + 1}`
                      : ""}
                  </span>
                </div>
                <MentionDetails
                  lineText={result.line}
                  tokens={mention.tokens}
                  quantity={mention.quantity}
                  summary={mention.summary}
                  candidates={mention.candidates}
                  unresolved={mention.unresolved}
                />
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section
        aria-labelledby="simulate-heading"
        className="flex flex-col gap-3"
      >
        <h2
          id="simulate-heading"
          className="text-lg font-semibold text-greyscale-900"
        >
          Simulate decision
        </h2>
        <form onSubmit={handleSimulate} className="flex flex-col gap-2">
          <Label htmlFor={payloadId}>
            Decision (JSON, as in DecisionPayloadSchema)
          </Label>
          <Textarea
            id={payloadId}
            value={payloadText}
            rows={4}
            className="font-mono text-sm"
            onChange={(event) => setPayloadText(event.target.value)}
          />
          <Button
            type="submit"
            variant="outline"
            className="self-start"
            disabled={isPreviewing}
          >
            {isPreviewing ? "Simulating…" : "Preview impact"}
          </Button>
        </form>
        <ImpactPreview
          preview={preview}
          isLoading={isPreviewing}
          error={previewError}
        />
      </section>
    </div>
  );
}
