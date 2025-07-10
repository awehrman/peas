"use client";

import { ReactNode } from "react";
import { SignUpForm } from "../../lib/auth/components/sign-up-form";

export const dynamic = "force-dynamic";

export default function SignUpPage(): ReactNode {
  return <SignUpForm />;
}
