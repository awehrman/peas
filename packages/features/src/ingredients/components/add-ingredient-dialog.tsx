"use client";

import { type FormEvent, type ReactNode, useState } from "react";

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
import { Plus, Sparkles } from "lucide-react";
import pluralize from "pluralize";

import { InlineError, type MutationAction, useMutation } from "../../shared";
import type { IngredientCreateInput } from "../types";
import { validateIngredientNames } from "../utils/validate-ingredient";

export type CreateIngredient = MutationAction<
  [input: IngredientCreateInput],
  { id: string }
>;

interface AddIngredientDialogProps {
  onCreate: CreateIngredient;
  onCreated: (id: string) => void;
}

export function AddIngredientDialog({
  onCreate,
  onCreated,
}: AddIngredientDialogProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [plural, setPlural] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const create = useMutation(onCreate);

  const errors = validateIngredientNames(name, plural);
  const hasErrors = Object.keys(errors).length > 0;

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (!open) {
      setName("");
      setPlural("");
      setHasSubmitted(false);
      create.clearError();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);
    if (hasErrors) return;

    const result = await create.run({
      name: name.trim(),
      plural: plural.trim() || null,
    });
    if (result.success && result.data) {
      handleOpenChange(false);
      onCreated(result.data.id);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus aria-hidden="true" />
          Add ingredient
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <DialogHeader>
            <DialogTitle>Add ingredient</DialogTitle>
            <DialogDescription>
              New ingredients start out unreviewed so they show up in the review
              queue.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-ingredient-name">Name</Label>
            <Input
              id="new-ingredient-name"
              value={name}
              required
              autoFocus
              aria-invalid={hasSubmitted && !!errors.name}
              aria-describedby={
                hasSubmitted && errors.name
                  ? "new-ingredient-name-error"
                  : undefined
              }
              onChange={(event) => setName(event.target.value)}
            />
            {hasSubmitted && errors.name ? (
              <p
                id="new-ingredient-name-error"
                className="text-xs text-error-700"
              >
                {errors.name}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-ingredient-plural">Plural (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="new-ingredient-plural"
                value={plural}
                aria-invalid={!!errors.plural}
                aria-describedby={
                  errors.plural ? "new-ingredient-plural-error" : undefined
                }
                onChange={(event) => setPlural(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Fill in the plural automatically"
                disabled={!name.trim()}
                onClick={() => setPlural(pluralize.plural(name.trim()))}
              >
                <Sparkles aria-hidden="true" />
              </Button>
            </div>
            {errors.plural ? (
              <p
                id="new-ingredient-plural-error"
                className="text-xs text-error-700"
              >
                {errors.plural}
              </p>
            ) : null}
          </div>
          <InlineError message={create.error} />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Adding..." : "Add ingredient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
