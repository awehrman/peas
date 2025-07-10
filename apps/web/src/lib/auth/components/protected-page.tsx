import { redirect } from "next/navigation";
import { getAuth } from "../queries/get-auth";
import { loginPath } from "../../../paths";

interface ProtectedPageProps {
  children: React.ReactNode;
}

export async function ProtectedPage({ children }: ProtectedPageProps) {
  const { user } = await getAuth();

  if (!user) {
    redirect(loginPath());
  }

  return <>{children}</>;
}
