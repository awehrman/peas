import { ReactNode } from "react";
import { LoginForm } from "../../lib/auth/components/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage(): ReactNode {
  return <LoginForm />;
}
