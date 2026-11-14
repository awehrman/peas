import type { ReactNode } from "react";

export function InlineError({
  message,
}: {
  message: string | null;
}): ReactNode {
  if (!message) return null;

  return (
    <p role="alert" className="text-sm text-error-700">
      {message}
    </p>
  );
}
