import { ReactNode } from "react";
import { LoginForm } from "@peas/features";

export default function LoginPage(): ReactNode {
  return <LoginForm loginPath="/login" />;
}
