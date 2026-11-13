import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReinterpretProgressBanner } from "../reinterpret-progress";
import type { ReinterpretProgress } from "../types";

function progress(overrides: Partial<ReinterpretProgress>): ReinterpretProgress {
  return {
    jobId: "reinterpret-15",
    status: "PROCESSING",
    processedCount: 400,
    totalCount: 1200,
    errorMessage: null,
    ...overrides,
  };
}

describe("ReinterpretProgressBanner", () => {
  it("renders nothing before a run is tracked", () => {
    const { container } = render(<ReinterpretProgressBanner progress={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows line counts and a progress bar while the run is going", () => {
    render(<ReinterpretProgressBanner progress={progress({})} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Updating mentions in the background: 400 of 1,200 lines"
    );
    expect(
      screen.getByRole("progressbar", { name: "Reinterpretation progress" })
    ).toHaveAttribute("aria-valuenow", "33");
  });

  it("shows a pending run without counts", () => {
    render(
      <ReinterpretProgressBanner
        progress={progress({ status: "PENDING", processedCount: null, totalCount: null })}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Updating mentions in the background"
    );
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("reports completion and failures", () => {
    const { rerender } = render(
      <ReinterpretProgressBanner
        progress={progress({ status: "COMPLETED", processedCount: 1200 })}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Mentions are up to date: 1,200 lines reinterpreted"
    );
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    rerender(
      <ReinterpretProgressBanner
        progress={progress({ status: "FAILED", errorMessage: "1 batch failed" })}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Reinterpretation stopped after 400 of 1,200 lines: 1 batch failed"
    );

    rerender(<ReinterpretProgressBanner progress={progress({ status: "MISSING" })} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Reinterpretation was not found; the queue may be offline"
    );
  });
});
