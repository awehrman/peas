import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createMockUploadBatch } from "../../../test-utils/factories";

vi.mock("@peas/components", () => ({
  cn: (...classes: Array<string | undefined>) => classes.filter(Boolean).join(" "),
}));

const { UploadBatchHistory } = await import("../upload-batch-history");

function createBatches(count: number) {
  return Array.from({ length: count }, (_, i) =>
    createMockUploadBatch({ importId: `import-${i}`, directoryName: `Note ${i}`, files: [] })
  );
}

describe("UploadBatchHistory", () => {
  it("renders nothing without batches", () => {
    const { container } = render(<UploadBatchHistory batches={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("summarizes counts and lists failures first", () => {
    const batches = [
      ...createBatches(2),
      createMockUploadBatch({
        importId: "failed",
        directoryName: "Broken note",
        errorMessage: "Request too large",
      }),
    ];

    render(<UploadBatchHistory batches={batches} />);

    expect(screen.getByText(/2 uploaded/)).toBeInTheDocument();
    expect(screen.getByText(/1 failed/)).toBeInTheDocument();
    const rows = within(screen.getByLabelText("Uploaded notes")).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Broken note");
    expect(rows[0]).toHaveTextContent("Request too large");
  });

  it("shows the note being uploaded as the first row, newest uploads next", () => {
    const currentBatch = createMockUploadBatch({
      importId: "in-flight",
      directoryName: "Country Fried Venison Steak",
    });

    render(<UploadBatchHistory batches={createBatches(2)} currentBatch={currentBatch} />);

    expect(screen.getByText(/2 uploaded/)).toBeInTheDocument();
    const rows = within(screen.getByLabelText("Uploaded notes")).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Country Fried Venison Steak");
    expect(rows[0]).toHaveTextContent("Uploading…");
    expect(rows[1]).toHaveTextContent("Note 1");
  });

  it("only mounts the visible window of a long history", () => {
    render(<UploadBatchHistory batches={createBatches(500)} />);

    expect(screen.getByText(/500 uploaded/)).toBeInTheDocument();
    const rows = within(screen.getByLabelText("Uploaded notes")).getAllByRole("listitem");
    expect(rows.length).toBeLessThan(50);
  });
});
