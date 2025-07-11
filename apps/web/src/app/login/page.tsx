import { ReactNode } from "react";
import { LoginForm } from "../../lib/auth/components/forms/login";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}): Promise<ReactNode> {
  const params = await searchParams;
  return <LoginForm error={params.error} />;
}
