import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppNavigationProvider } from "../../app-navigation";
import { GlossaryPageContent } from "../glossary";

describe("GlossaryPageContent", () => {
  it("walks through one line step by step and defines the terms", () => {
    render(
      <AppNavigationProvider push={vi.fn()}>
        <GlossaryPageContent />
      </AppNavigationProvider>
    );
    expect(
      screen.getByRole("heading", { name: "Glossary", level: 1 })
    ).toBeInTheDocument();

    const steps = screen.getByRole("list", { name: "How one line is read" });
    expect(within(steps).getAllByRole("heading", { level: 3 })).toHaveLength(7);
    expect(
      within(steps).getByRole("list", { name: "Tokens" }).children
    ).toHaveLength(11);
    expect(
      within(steps)
        .getAllByText("chicken thighs")
        .some((element) => element.textContent === "chicken thighs (food)")
    ).toBe(true);
    expect(within(steps).getByText("1 1/2 lb")).toBeInTheDocument();

    const sections: Record<string, string[]> = {
      "Reading a line": ["Line", "Grammar", "Quantity", "Mention"],
      Knowledge: ["Concept", "Lexicon entry", "Role", "Relationship"],
      Reviewing: ["Decision", "Revision", "Impact preview"],
    };
    for (const [section, terms] of Object.entries(sections)) {
      const region = screen.getByRole("region", { name: section });
      for (const term of terms)
        expect(
          within(region).getByText(term, { selector: "dt" })
        ).toBeInTheDocument();
    }
    expect(document.getElementById("concept")).not.toBeNull();
    expect(screen.getByRole("link", { name: "playground" })).toHaveAttribute(
      "href",
      "/teach/playground"
    );
  });
});
