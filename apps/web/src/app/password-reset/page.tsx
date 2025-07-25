import { ReactNode } from "react";
import { UnauthenticatedLayout } from "../../lib/auth/components/unauthenticated-layout";
import { Button, Input } from "@peas/ui";

export default function PasswordResetPage(): ReactNode {
  return (
    <UnauthenticatedLayout
      title="Reset Password"
      subtitle="Enter your email to receive a password reset link"
    >
      <form className="space-y-4">
        <Input name="email" type="email" placeholder="Email" required />
        <Button type="submit" className="w-full">
          Send Reset Link
        </Button>
      </form>
    </UnauthenticatedLayout>
  );
}
