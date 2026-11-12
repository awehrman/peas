"use client";

import { type ReactElement, type ReactNode, useState } from "react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@peas/components";

import { InlineError } from "./inline-error";
import type { MutationResult } from "./mutation-result";

interface ConfirmDialogProps {
  trigger: ReactElement;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<MutationResult<unknown>>;
  isDestructive?: boolean;
}

/**
 * Asks before running an irreversible action; stays open to show errors.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  isDestructive = true,
}: ConfirmDialogProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsPending(true);
    setError(null);
    const result = await onConfirm();
    setIsPending(false);
    if (result.success) setIsOpen(false);
    else setError(result.message);
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <InlineError message={error} />
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={isDestructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Working..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
