"use client";

import { type FormEvent, type ReactNode, useState } from "react";

import { Button, Input, Label } from "@peas/components";
import { Search } from "lucide-react";

interface SearchFormProps {
  id: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  onSearch: (query: string) => void;
}

/**
 * Labelled search box that hands the trimmed query to `onSearch`.
 */
export function SearchForm({
  id,
  label,
  defaultValue = "",
  placeholder,
  onSearch,
}: SearchFormProps): ReactNode {
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(value.trim());
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="flex items-end gap-2"
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          className="w-64"
        />
      </div>
      <Button type="submit" variant="outline" aria-label="Search">
        <Search aria-hidden="true" />
      </Button>
    </form>
  );
}
