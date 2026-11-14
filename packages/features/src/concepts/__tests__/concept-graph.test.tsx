import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppNavigationProvider } from "../../app-navigation";
import {
  type ConceptGraphData,
  type ConceptGraphOptions,
  ConceptGraphView,
  layoutGraph,
} from "../concept-graph";

const graph: ConceptGraphData = {
  centerId: "thigh",
  truncated: false,
  nodes: [
    {
      id: "chicken",
      canonicalName: "chicken",
      status: "VERIFIED",
      level: -1,
      directMentions: 3,
    },
    {
      id: "thigh",
      canonicalName: "chicken thigh",
      status: "VERIFIED",
      level: 0,
      directMentions: 12,
    },
    {
      id: "breast",
      canonicalName: "chicken breast",
      status: "VERIFIED",
      level: 0,
      directMentions: 1,
    },
    {
      id: "boneless",
      canonicalName: "boneless skinless chicken thigh",
      status: "PROPOSED",
      level: 1,
      directMentions: 0,
    },
  ],
  edges: [
    {
      id: "e1",
      sourceId: "thigh",
      targetId: "chicken",
      type: "PART_OF",
      status: "ACTIVE",
      decision: null,
    },
    {
      id: "e2",
      sourceId: "breast",
      targetId: "chicken",
      type: "PART_OF",
      status: "ACTIVE",
      decision: { revision: 14, username: "allie" },
    },
    {
      id: "e3",
      sourceId: "boneless",
      targetId: "thigh",
      type: "IS_A",
      status: "PROPOSED",
      decision: null,
    },
  ],
};

const OPTIONS: ConceptGraphOptions = {
  depth: 2,
  types: ["IS_A", "PART_OF", "DERIVED_FROM", "PROCESSED_FROM"],
  direction: "BOTH",
};

function renderGraph(
  overrides: Partial<Parameters<typeof ConceptGraphView>[0]> = {},
  push = vi.fn()
) {
  const onOptionsChange = vi.fn();
  render(
    <AppNavigationProvider push={push}>
      <ConceptGraphView
        graph={graph}
        centerName="chicken thigh"
        options={OPTIONS}
        onOptionsChange={onOptionsChange}
        graphHref={(id) => `/concepts/${id}/graph`}
        backHref="/concepts/thigh"
        {...overrides}
      />
    </AppNavigationProvider>
  );
  return { onOptionsChange, push };
}

describe("layoutGraph", () => {
  it("puts more general foods above and spreads each row", () => {
    const layout = layoutGraph(graph.nodes);
    const y = (id: string) =>
      layout.nodes.find((node) => node.id === id)?.y ?? 0;
    expect(y("chicken")).toBeLessThan(y("thigh"));
    expect(y("thigh")).toBe(y("breast"));
    expect(y("boneless")).toBeGreaterThan(y("thigh"));
    const row = layout.nodes
      .filter((node) => node.level === 0)
      .map((node) => node.x);
    expect(row[0]).toBeLessThan(row[1] ?? 0);
    expect(layout.width).toBeGreaterThanOrEqual(720);
    expect(layoutGraph([]).nodes).toEqual([]);
  });
});

describe("ConceptGraphView", () => {
  it("lists foods and relationships with their evidence", () => {
    renderGraph();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Relationships around chicken thigh",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("4 foods, 3 relationships")).toBeInTheDocument();
    const foods = screen.getByRole("region", { name: "Foods" });
    expect(
      within(foods).getByRole("link", { name: "chicken" })
    ).toHaveAttribute("href", "/concepts/chicken/graph");
    expect(
      within(foods).queryByRole("link", { name: "chicken thigh" })
    ).not.toBeInTheDocument();
    expect(
      within(foods).getByText(/1 step more general · 3 mentions/)
    ).toBeInTheDocument();
    expect(
      within(foods).getByText(/1 step more specific · 0 mentions · proposed/)
    ).toBeInTheDocument();
    expect(
      within(foods).getByRole("link", {
        name: "Concept page for chicken breast",
      })
    ).toHaveAttribute("href", "/concepts/breast");
    const relationships = screen.getByRole("region", { name: "Relationships" });
    expect(relationships).toHaveTextContent(
      "chicken breast is part of chicken · added by allie in revision 14"
    );
    expect(relationships).toHaveTextContent(
      "chicken thigh is part of chicken · seeded, no decision"
    );
    expect(relationships).toHaveTextContent(
      "boneless skinless chicken thigh is a kind of chicken thigh (proposed)"
    );
  });

  it("draws the graph and recenters when a food is clicked", () => {
    const { push } = renderGraph();
    const drawing = document.querySelector("svg marker")?.closest("svg");
    expect(drawing?.querySelectorAll("line")).toHaveLength(3);
    expect(drawing?.textContent).toContain("boneless skinless…");
    const chicken = [...(drawing?.querySelectorAll("g") ?? [])].find((group) =>
      group.querySelector("title")?.textContent?.startsWith("chicken:")
    );
    fireEvent.click(chicken as Element);
    expect(push).toHaveBeenCalledWith("/concepts/chicken/graph");
  });

  it("reports switch changes, keeping relationship types in order", () => {
    const { onOptionsChange } = renderGraph({
      options: { ...OPTIONS, types: ["PART_OF"] },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "a kind of" }));
    expect(onOptionsChange).toHaveBeenLastCalledWith({
      ...OPTIONS,
      types: ["IS_A", "PART_OF"],
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "part of" }));
    expect(onOptionsChange).toHaveBeenLastCalledWith({ ...OPTIONS, types: [] });
    fireEvent.change(screen.getByLabelText("Steps"), {
      target: { value: "3" },
    });
    expect(onOptionsChange).toHaveBeenLastCalledWith({
      ...OPTIONS,
      types: ["PART_OF"],
      depth: 3,
    });
    fireEvent.change(screen.getByLabelText("Direction"), {
      target: { value: "UP" },
    });
    expect(onOptionsChange).toHaveBeenLastCalledWith({
      ...OPTIONS,
      types: ["PART_OF"],
      direction: "UP",
    });
  });

  it("explains a truncated or empty neighborhood and shows updates", () => {
    renderGraph({
      graph: {
        ...graph,
        edges: [],
        nodes: graph.nodes.slice(1, 2),
        truncated: true,
      },
    });
    expect(screen.getByText(/stopped at 150 foods/)).toBeInTheDocument();
    expect(
      screen.getByText("No relationships with these switches.")
    ).toBeInTheDocument();
  });

  it("announces updates", () => {
    renderGraph({ isUpdating: true });
    expect(screen.getByText("Updating…")).toBeInTheDocument();
  });
});
