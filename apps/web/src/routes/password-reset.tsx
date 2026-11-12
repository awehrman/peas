import { UnauthenticatedLayout } from "~/components/unauthenticated-layout";

import { Button, Input } from "@peas/components";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/password-reset")({
  head: () => ({ meta: [{ title: "Reset password · Peas" }] }),
  component: PasswordResetPage,
});

/** Placeholder carried over from the Next.js app: password reset email is not implemented yet. */
function PasswordResetPage() {
  return (
    <UnauthenticatedLayout
      title="Reset Password"
      subtitle="Enter your email to receive a password reset link"
    >
      <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
        <Input
          name="email"
          type="email"
          aria-label="Email"
          placeholder="Email"
          required
        />
        <Button type="submit" className="w-full">
          Send Reset Link
        </Button>
      </form>
    </UnauthenticatedLayout>
  );
}
