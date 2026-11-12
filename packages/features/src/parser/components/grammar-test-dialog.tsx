"use client";

import { type FormEvent, type ReactElement, type ReactNode, useState } from "react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from "@peas/components";
import { Plus, Sparkles, Trash2, Wand2 } from "lucide-react";

import { KNOWN_SEGMENT_TYPES } from "../../parsed-line";
import { InlineError, type MutationAction, useMutation } from "../../shared";
import type { GrammarSegmentView, GrammarTestDraft } from "../types";
import { splitReferenceIntoExpectations, validateTestDraft } from "../utils/test-draft";

export type SaveGrammarTest = MutationAction<[draft: GrammarTestDraft]>;
export type PreviewStaticParse = MutationAction<[reference: string], GrammarSegmentView[]>;

interface GrammarTestDialogProps {
  title: string;
  trigger: ReactElement;
  initialDraft: GrammarTestDraft;
  onSave: SaveGrammarTest;
  onPreview?: PreviewStaticParse;
  idPrefix: string;
}

const SEGMENT_TYPES_LIST_ID = "grammar-test-segment-types";

export function GrammarTestDialog({
  title,
  trigger,
  initialDraft,
  onSave,
  onPreview,
  idPrefix,
}: GrammarTestDialogProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(initialDraft);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const save = useMutation(onSave);
  const preview = useMutation(onPreview);
  const errors = validateTestDraft(draft);
  const fieldId = (field: string) => `${idPrefix}-${field}`;

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (open) {
      setDraft(initialDraft);
      setHasSubmitted(false);
      save.clearError();
      preview.clearError();
    }
  }

  function updateExpectation(index: number, changes: Partial<GrammarSegmentView>) {
    setDraft({
      ...draft,
      expectations: draft.expectations.map((expectation, position) =>
        position === index ? { ...expectation, ...changes } : expectation
      ),
    });
  }

  async function fillFromStaticParser() {
    const result = await preview.run(draft.reference);
    if (result.success && result.data) {
      setDraft({
        ...draft,
        expectations: result.data.map(({ type, value }) => ({ type, value })),
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);
    if (Object.keys(errors).length > 0) return;

    const result = await save.run({
      reference: draft.reference.trim(),
      expectations: draft.expectations.map(({ type, value }) => ({
        type: type.trim(),
        value: value.trim(),
      })),
    });
    if (result.success) setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              A test passes when the parser returns exactly these segments, in this order.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor={fieldId("reference")}>Ingredient line</Label>
            <Input
              id={fieldId("reference")}
              value={draft.reference}
              placeholder="2 cups flour, sifted"
              aria-invalid={hasSubmitted && !!errors.reference}
              aria-describedby={hasSubmitted && errors.reference ? fieldId("reference-error") : undefined}
              onChange={(event) => setDraft({ ...draft, reference: event.target.value })}
            />
            {hasSubmitted && errors.reference ? (
              <p id={fieldId("reference-error")} className="text-xs text-error-700">
                {errors.reference}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!draft.reference.trim()}
                onClick={() =>
                  setDraft({ ...draft, expectations: splitReferenceIntoExpectations(draft.reference) })
                }
              >
                <Wand2 aria-hidden="true" />
                Split on spaces
              </Button>
              {onPreview ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!draft.reference.trim() || preview.isPending}
                  onClick={fillFromStaticParser}
                >
                  <Sparkles aria-hidden="true" />
                  {preview.isPending ? "Parsing..." : "Fill from static v1"}
                </Button>
              ) : null}
            </div>
            <InlineError message={preview.error} />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Expected segments</legend>
            <datalist id={SEGMENT_TYPES_LIST_ID}>
              {KNOWN_SEGMENT_TYPES.map((type) => (
                <option key={type} value={type} />
              ))}
            </datalist>
            {draft.expectations.length === 0 ? (
              <p className="text-sm text-greyscale-600">No expected segments yet.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {draft.expectations.map((expectation, index) => (
                  <li key={index} className="flex items-end gap-2">
                    <span className="w-6 pb-2 text-right text-xs text-greyscale-500">{index + 1}</span>
                    <div className="flex w-40 flex-col gap-1">
                      <Label htmlFor={fieldId(`type-${index}`)} className="text-xs">
                        Type
                      </Label>
                      <Input
                        id={fieldId(`type-${index}`)}
                        list={SEGMENT_TYPES_LIST_ID}
                        value={expectation.type}
                        onChange={(event) => updateExpectation(index, { type: event.target.value })}
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <Label htmlFor={fieldId(`value-${index}`)} className="text-xs">
                        Value
                      </Label>
                      <Input
                        id={fieldId(`value-${index}`)}
                        value={expectation.value}
                        onChange={(event) => updateExpectation(index, { value: event.target.value })}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove expected segment ${index + 1}`}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          expectations: draft.expectations.filter((_, position) => position !== index),
                        })
                      }
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ol>
            )}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setDraft({
                    ...draft,
                    expectations: [...draft.expectations, { type: "ingredient", value: "" }],
                  })
                }
              >
                <Plus aria-hidden="true" />
                Add segment
              </Button>
            </div>
            {hasSubmitted && errors.expectations ? (
              <p className="text-xs text-error-700">{errors.expectations}</p>
            ) : null}
          </fieldset>

          <InlineError message={save.error} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving..." : "Save test"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
