import { Button, Placeholder, Spinner } from "@peas/components";
import {
  type ErrorComponentProps,
  Link,
  useRouter,
} from "@tanstack/react-router";
import { AlertTriangle, Search } from "lucide-react";

/** Shown while a route's data loads (after the router's pending delay). */
export function PendingState() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex min-h-[40vh] items-center justify-center"
    >
      <Spinner />
    </div>
  );
}

/** A route threw: show the message and let the user retry or go home. */
export function ErrorState({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <Placeholder
      label={
        (error instanceof Error && error.message) || "Something went wrong"
      }
      icon={<AlertTriangle />}
      button={
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              reset();
              void router.invalidate();
            }}
          >
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Go home</Link>
          </Button>
        </div>
      }
    />
  );
}

export function NotFoundState() {
  return <Placeholder label="Page not found" icon={<Search />} />;
}
