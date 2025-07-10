import { redirect } from "next/navigation";
import {
  getSignUpCodes,
  validateSignUpCode,
} from "../../../lib/auth/utils/sign-up-codes";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{
    code?: string;
  }>;
}) {
  const { code } = await params;
  const allowedCodes = getSignUpCodes();

  // If the app has no codes configured, allow anyone in.
  if (allowedCodes.length === 0) {
    const { SignUpForm } = await import(
      "../../../lib/auth/components/sign-up-form"
    );
    return <SignUpForm />;
  }

  // Extract the code from the dynamic segment.
  if (!code) {
    redirect("/login?error=Sign-up%20code%20is%20required");
  }

  const { isValid, error } = validateSignUpCode(code, allowedCodes);

  if (!isValid) {
    redirect(
      `/login?error=${encodeURIComponent(error || "Invalid sign-up code")}`
    );
  }

  const { SignUpForm } = await import(
    "../../../lib/auth/components/sign-up-form"
  );
  return <SignUpForm />;
}
