"use client";

import { ImpactPreview } from "./impact-preview";
import type {
  DecisionPayload,
  DecisionPreview,
  PreviewDecision,
} from "./types";

import { type ReactNode, useCallback, useRef, useState } from "react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@peas/components";

interface PendingImpact {
  preview: DecisionPreview | null;
  error: string | null;
}

export interface ImpactConfirmation {
  /** Resolves true when the change reads no stored mention differently, or when the curator confirms it; false when they back out. */
  confirm: (payload: DecisionPayload) => Promise<boolean>;
  isChecking: boolean;
  /** The confirmation dialog; render it once next to the form. */
  dialog: ReactNode;
}

function mentions(count: number): string {
  return `${count} ${count === 1 ? "mention" : "mentions"}`;
}

/**
 * Checks what a knowledge change would do to stored parses before it is saved. A change that reads nothing differently saves straight away; otherwise a dialog shows how many mentions change, with before/after examples, and saves only once confirmed. Without `onPreview` every change saves straight away.
 *
 * @example
 * const impact = useImpactConfirmation(onPreview);
 * async function save() {
 *   if (!(await impact.confirm(payload))) return;
 *   await onApplyDecision(payload, null);
 * }
 * return <>{form}{impact.dialog}</>;
 */
export function useImpactConfirmation(
  onPreview?: PreviewDecision
): ImpactConfirmation {
  const [pending, setPending] = useState<PendingImpact | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const settleRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback(
    async (payload: DecisionPayload): Promise<boolean> => {
      if (!onPreview) return true;
      setIsChecking(true);
      let next: PendingImpact;
      try {
        const preview = await onPreview(payload);
        if (
          preview.counts.affected === 0 &&
          preview.counts.verifiedConflicts === 0
        )
          return true;
        next = { preview, error: null };
      } catch (error) {
        next = {
          preview: null,
          error:
            error instanceof Error
              ? error.message
              : "Could not check what this changes",
        };
      } finally {
        setIsChecking(false);
      }
      setPending(next);
      return new Promise<boolean>((resolve) => {
        settleRef.current = resolve;
      });
    },
    [onPreview]
  );

  function settle(confirmed: boolean) {
    settleRef.current?.(confirmed);
    settleRef.current = null;
    setPending(null);
  }

  const affected = pending?.preview?.counts.affected ?? 0;
  const dialog = (
    <Dialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {pending?.error
              ? "Couldn't check what this changes"
              : `This changes how ${mentions(affected)} read`}
          </DialogTitle>
          <DialogDescription>
            {pending?.error
              ? "You can save anyway, or cancel and try again."
              : "Saving reinterprets these parsed lines with the new knowledge. Verified mentions never change automatically."}
          </DialogDescription>
        </DialogHeader>
        {pending ? (
          <ImpactPreview
            preview={pending.preview}
            isLoading={false}
            error={pending.error}
          />
        ) : null}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => settle(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => settle(true)}>
            {pending?.error ? "Save anyway" : "Save and update lines"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, isChecking, dialog };
}
