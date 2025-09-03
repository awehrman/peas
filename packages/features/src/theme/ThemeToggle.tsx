"use client";

import { useTheme } from "./ThemeContext";

import { Toggle } from "@peas/components";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Toggle
      pressed={theme === "dark"}
      onPressedChange={toggleTheme}
      size="default"
      variant="default"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Toggle>
  );
}
