"use client";

import { type ReactNode, useState } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@peas/components";
import { Copy } from "lucide-react";

import type { GrammarCompileErrorView } from "../types";

interface CompiledGrammarPanelProps {
  source: string;
  errors: GrammarCompileErrorView[];
}

export function formatCompileError(error: GrammarCompileErrorView): string {
  return error.line ? `Line ${error.line}, column ${error.column ?? 1}: ${error.message}` : error.message;
}

export function CompileErrorsAlert({ errors }: { errors: GrammarCompileErrorView[] }): ReactNode {
  if (errors.length === 0) return null;

  return (
    <Alert variant="destructive">
      <AlertTitle>The grammar doesn't compile</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-4">
          {errors.map((error, index) => (
            <li key={`${index}-${error.message}`}>{formatCompileError(error)}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Read-only view of the Peggy source generated from the database rules.
 */
export function CompiledGrammarPanel({ source, errors }: CompiledGrammarPanelProps): ReactNode {
  const [copied, setCopied] = useState(false);

  async function copySource() {
    await window.navigator.clipboard.writeText(source);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          <h2>Compiled grammar</h2>
        </CardTitle>
        <Button type="button" variant="outline" onClick={copySource} disabled={!source.trim()}>
          <Copy aria-hidden="true" />
          {copied ? "Copied" : "Copy"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <CompileErrorsAlert errors={errors} />
        <pre
          tabIndex={0}
          aria-label="Compiled Peggy grammar"
          className="max-h-[60vh] overflow-auto rounded bg-greyscale-50 p-4 font-mono text-xs text-greyscale-800"
        >
          {source.trim() ? source : "// No rules yet"}
        </pre>
      </CardContent>
    </Card>
  );
}
