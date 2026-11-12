"use client";

import { type ReactNode, useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@peas/components";
import { Upload } from "lucide-react";

import { InlineError, type MutationAction, formatDate, useMutation } from "../../shared";
import type { ActiveParserOption, GrammarVersionView, ParserSettingsView } from "../types";

export interface ParserSwitchActions {
  onPublish: MutationAction<[], { versionId: string; testsPassed: number; testsTotal: number }>;
  onSetActiveParser: MutationAction<[parser: ActiveParserOption, grammarVersionId: string | null]>;
}

interface ParserSwitchCardProps extends ParserSwitchActions {
  settings: ParserSettingsView;
  canPublish: boolean;
}

function describeVersion(version: GrammarVersionView): string {
  return `${formatDate(version.publishedAt)} · ${version.hash.slice(0, 8)} · ${version.ruleCount} rules · ${version.testsPassed}/${version.testsTotal} tests`;
}

/**
 * Chooses which grammar the import queue uses for ingredient lines, and
 * publishes the current database rules as a frozen version.
 */
export function ParserSwitchCard({
  settings,
  canPublish,
  onPublish,
  onSetActiveParser,
}: ParserSwitchCardProps): ReactNode {
  const [choice, setChoice] = useState<ActiveParserOption>(settings.activeParser);
  const [versionId, setVersionId] = useState<string | null>(
    settings.activeGrammarVersion?.id ?? settings.versions[0]?.id ?? null
  );
  const [message, setMessage] = useState<string | null>(null);
  const publish = useMutation(onPublish);
  const save = useMutation(onSetActiveParser);

  const activeVersion = settings.activeGrammarVersion;
  const isUnchanged =
    choice === settings.activeParser &&
    (choice === "STATIC_V1" || versionId === activeVersion?.id);

  async function handlePublish() {
    setMessage(null);
    const result = await publish.run();
    if (result.success && result.data) {
      setVersionId(result.data.versionId);
      setMessage(
        `Published. ${result.data.testsPassed} of ${result.data.testsTotal} tests pass. Select it below to use it for imports.`
      );
    }
  }

  async function handleSave() {
    setMessage(null);
    const result = await save.run(choice, choice === "DATABASE" ? versionId : null);
    if (result.success) setMessage("Saved. New imports will use this parser within a few seconds.");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle>
            <h2>Import parser</h2>
          </CardTitle>
          <CardDescription>
            Imports currently use{" "}
            <strong>
              {settings.activeParser === "STATIC_V1" || !activeVersion
                ? "the static v1 grammar"
                : `database grammar ${activeVersion.hash.slice(0, 8)}`}
            </strong>
            .
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handlePublish}
          disabled={!canPublish || publish.isPending}
          title={canPublish ? undefined : "Add rules that compile before publishing"}
        >
          <Upload aria-hidden="true" />
          {publish.isPending ? "Publishing..." : "Publish current rules"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Parser used for imports</legend>
          <ParserOption
            value="STATIC_V1"
            checked={choice === "STATIC_V1"}
            onChange={setChoice}
            title="Static v1 grammar"
            description="The hand-written grammar in packages/parser. This is the one to beat."
          />
          <ParserOption
            value="DATABASE"
            checked={choice === "DATABASE"}
            onChange={setChoice}
            disabled={settings.versions.length === 0}
            title="Database grammar"
            description={
              settings.versions.length === 0
                ? "Publish the rules first to make a version available."
                : "A published snapshot of the rules built on this page."
            }
          />
        </fieldset>

        {choice === "DATABASE" && settings.versions.length > 0 ? (
          <div className="flex flex-col gap-1 sm:max-w-lg">
            <Label htmlFor="grammar-version">Published version</Label>
            <Select value={versionId ?? undefined} onValueChange={setVersionId}>
              <SelectTrigger id="grammar-version">
                <SelectValue placeholder="Choose a version" />
              </SelectTrigger>
              <SelectContent>
                {settings.versions.map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    {describeVersion(version)}
                    {version.id === activeVersion?.id ? " (active)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={handleSave}
            disabled={isUnchanged || save.isPending || (choice === "DATABASE" && !versionId)}
          >
            {save.isPending ? "Saving..." : "Use for imports"}
          </Button>
          {settings.activeParser === "DATABASE" && activeVersion ? (
            <Badge variant="secondary">
              Active: {activeVersion.testsPassed}/{activeVersion.testsTotal} tests at publish time
            </Badge>
          ) : null}
        </div>

        <InlineError message={publish.error ?? save.error} />
        {message ? (
          <p role="status" className="text-sm text-greyscale-700">
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ParserOption({
  value,
  checked,
  onChange,
  title,
  description,
  disabled = false,
}: {
  value: ActiveParserOption;
  checked: boolean;
  onChange: (value: ActiveParserOption) => void;
  title: string;
  description: string;
  disabled?: boolean;
}): ReactNode {
  const id = `parser-option-${value}`;
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md border p-3",
        checked && "border-primary bg-primary-50",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <input
        id={id}
        type="radio"
        name="active-parser"
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="mt-1"
      />
      <span className="flex flex-col">
        <span className="font-medium">{title}</span>
        <span className="text-sm text-greyscale-600">{description}</span>
      </span>
    </label>
  );
}
