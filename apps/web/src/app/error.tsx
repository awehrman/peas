"use client";

import Link from "next/link";

import { Button, Placeholder } from "@peas/components";
import { dashboardPath } from "src/paths";

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <Placeholder
      label={error.message || "Something went wrong!"}
      button={
        <Button asChild variant="outline">
          <Link href={dashboardPath()}>Go Home</Link>
        </Button>
      }
    />
  );
}
