"use client";

import { Button, Placeholder } from "@peas/ui";
import Link from "next/link";
import { dashboardPath } from "paths";

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
