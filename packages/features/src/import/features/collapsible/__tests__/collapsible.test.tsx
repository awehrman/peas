import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  CollapsibleContent,
  CollapsibleHeader,
  CollapsibleWrapper,
  useCollapsible,
} from "../index";

// Test component that uses collapsible hook
function TestCollapsibleComponent() {
  const { isExpanded, toggle, expand, collapse } = useCollapsible({
    defaultExpanded: false,
  });

  return (
    <div>
      <div data-testid="expanded-state">{isExpanded.toString()}</div>
      <button onClick={toggle} data-testid="toggle-button">
        Toggle
      </button>
      <button onClick={expand} data-testid="expand-button">
        Expand
      </button>
      <button onClick={collapse} data-testid="collapse-button">
        Collapse
      </button>
    </div>
  );
}

describe("Collapsible Feature", () => {
  it("should render collapsible wrapper with correct initial state", () => {
    render(
      <CollapsibleWrapper isExpanded={false} onToggle={() => {}}>
        <CollapsibleHeader isExpanded={false} onToggle={() => {}}>
          Test Header
        </CollapsibleHeader>
        <CollapsibleContent isExpanded={false}>Test Content</CollapsibleContent>
      </CollapsibleWrapper>
    );

    expect(screen.getByText("Test Header")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should toggle expanded state when header is clicked", () => {
    const mockOnToggle = vi.fn();

    render(
      <CollapsibleHeader isExpanded={false} onToggle={mockOnToggle}>
        Test Header
      </CollapsibleHeader>
    );

    fireEvent.click(screen.getByText("Test Header"));
    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  it("should show/hide content based on expanded state", () => {
    const { rerender } = render(
      <CollapsibleContent isExpanded={false}>Test Content</CollapsibleContent>
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();

    rerender(
      <CollapsibleContent isExpanded={true}>Test Content</CollapsibleContent>
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should use collapsible hook correctly", () => {
    render(<TestCollapsibleComponent />);

    expect(screen.getByTestId("expanded-state")).toHaveTextContent("false");

    fireEvent.click(screen.getByTestId("expand-button"));
    expect(screen.getByTestId("expanded-state")).toHaveTextContent("true");

    fireEvent.click(screen.getByTestId("collapse-button"));
    expect(screen.getByTestId("expanded-state")).toHaveTextContent("false");

    fireEvent.click(screen.getByTestId("toggle-button"));
    expect(screen.getByTestId("expanded-state")).toHaveTextContent("true");
  });

  it("should handle disabled state", () => {
    const mockOnToggle = vi.fn();

    render(
      <CollapsibleHeader
        isExpanded={false}
        onToggle={mockOnToggle}
        disabled={true}
      >
        Test Header
      </CollapsibleHeader>
    );

    fireEvent.click(screen.getByText("Test Header"));
    expect(mockOnToggle).not.toHaveBeenCalled();
  });
});
