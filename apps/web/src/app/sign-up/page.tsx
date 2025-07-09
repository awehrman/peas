"use client";

import { ReactNode } from "react";
import { SignUpForm } from "@peas/features";
import { loginPath } from "@/paths";

export default function SignUpPage(): ReactNode {
  return (
    <div className="flex items-center justify-center bg-background p-4">
      <SignUpForm loginPath={loginPath()} />
    </div>
  );
}
