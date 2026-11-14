"use client";

import { NoteStatusBadge, getNoteStatusLabel } from "./note-status-badge";

import type { ReactNode } from "react";

import {
  Badge,
  Placeholder,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "@peas/components";
import { StickyNote } from "lucide-react";

import { AppLink, buildHref, useAppNavigation } from "../../app-navigation";
import { PageLinks, SearchForm, formatDate } from "../../shared";
import {
  NOTE_STATUS_OPTIONS,
  type NoteListItem,
  type NotesFilters,
  type NotesPageData,
} from "../types";

const NOTES_PATH = "/notes";

interface NotesListPageContentProps {
  data: NotesPageData;
  filters: NotesFilters;
}

export function NotesListPageContent({
  data,
  filters,
}: NotesListPageContentProps): ReactNode {
  const { push } = useAppNavigation();
  const currentParams = { status: filters.status, q: filters.query };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <StatusFilter filters={filters} />
        <SearchForm
          key={filters.query ?? ""}
          id="notes-search"
          label="Search titles"
          defaultValue={filters.query}
          placeholder="e.g. lemon bars"
          onSearch={(query) =>
            push(buildHref(NOTES_PATH, currentParams, { q: query, page: null }))
          }
        />
      </div>

      <p className="text-sm text-greyscale-600" aria-live="polite">
        {data.total} {data.total === 1 ? "note" : "notes"}
      </p>

      {data.items.length === 0 ? (
        <Placeholder
          label="No notes match these filters yet."
          icon={<StickyNote />}
        />
      ) : (
        <NotesTable notes={data.items} />
      )}

      <PageLinks
        label="Notes pagination"
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        getHref={(page) => buildHref(NOTES_PATH, currentParams, { page })}
      />
    </div>
  );
}

function StatusFilter({ filters }: { filters: NotesFilters }): ReactNode {
  const options: { label: string; status?: NotesFilters["status"] }[] = [
    { label: "All" },
    ...NOTE_STATUS_OPTIONS.map((status) => ({
      label: getNoteStatusLabel(status),
      status,
    })),
  ];

  return (
    <nav aria-label="Filter notes by status">
      <ul className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = filters.status === option.status;
          return (
            <li key={option.label}>
              <AppLink
                href={buildHref(NOTES_PATH, {
                  status: option.status,
                  q: filters.query,
                })}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )}
              >
                {option.label}
              </AppLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NotesTable({ notes }: { notes: NoteListItem[] }): ReactNode {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">
            <span className="sr-only">Image</span>
          </TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ingredients</TableHead>
          <TableHead className="text-right">Instructions</TableHead>
          <TableHead className="text-right">Parse errors</TableHead>
          <TableHead>Notebook</TableHead>
          <TableHead>Imported</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {notes.map((note) => (
          <TableRow key={note.id}>
            <TableCell>
              {note.thumbnailUrl ? (
                <img
                  src={note.thumbnailUrl}
                  alt=""
                  loading="lazy"
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded object-cover"
                />
              ) : (
                <div
                  className="h-12 w-12 rounded bg-greyscale-100"
                  aria-hidden="true"
                />
              )}
            </TableCell>
            <TableCell className="font-medium">
              <AppLink
                href={`${NOTES_PATH}/${note.id}`}
                className="hover:underline"
              >
                {note.title || "Untitled note"}
              </AppLink>
              {note.recipeId ? (
                <Badge variant="secondary" className="ml-2">
                  Recipe
                </Badge>
              ) : null}
            </TableCell>
            <TableCell>
              <NoteStatusBadge
                status={note.status}
                duplicateConfidence={note.duplicateConfidence}
              />
            </TableCell>
            <TableCell className="text-right">
              {note.ingredientLineCount}
            </TableCell>
            <TableCell className="text-right">
              {note.instructionLineCount}
            </TableCell>
            <TableCell
              className={cn(
                "text-right",
                note.parsingErrorCount > 0 && "font-semibold text-error-700"
              )}
            >
              {note.parsingErrorCount}
            </TableCell>
            <TableCell>{note.notebook ?? ""}</TableCell>
            <TableCell>{formatDate(note.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
