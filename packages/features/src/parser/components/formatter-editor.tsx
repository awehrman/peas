"use client";

import { type ReactNode, Suspense, lazy } from "react";

import { Skeleton } from "@peas/components";

import type { FormatterCodeEditorProps } from "./formatter-code-editor";

const FormatterCodeEditor = lazy(() => import("./formatter-code-editor"));

/**
 * Loads CodeMirror only when a formatter is actually being edited.
 */
export function FormatterEditor(props: FormatterCodeEditorProps): ReactNode {
  return (
    <Suspense fallback={<Skeleton className="h-24 w-full" />}>
      <FormatterCodeEditor {...props} />
    </Suspense>
  );
}
