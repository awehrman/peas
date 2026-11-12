import { ReactNode } from "react";

import { AuthenticatedLayout } from "../../lib/auth/components/authenticated-layout";
import { getAuthOrRedirect } from "../../lib/auth/queries/get-auth-or-redirect";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { user } = await getAuthOrRedirect();

  return (
    <AuthenticatedLayout isAdmin={user.userType === "ADMIN"}>
      {children}
    </AuthenticatedLayout>
  );
}
