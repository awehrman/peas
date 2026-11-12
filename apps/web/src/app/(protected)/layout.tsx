import { ReactNode } from "react";

import { AuthenticatedLayout } from "../../lib/auth/components/authenticated-layout";
import { getAuthOrRedirect } from "../../lib/auth/queries/get-auth-or-redirect";
import { ensurePeaAvatar } from "../../lib/auth/utils/pea-avatar";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { user } = await getAuthOrRedirect();
  const avatarUrl = await ensurePeaAvatar(user);

  return (
    <AuthenticatedLayout
      isAdmin={user.userType === "ADMIN"}
      user={{ username: user.username, avatarUrl }}
    >
      {children}
    </AuthenticatedLayout>
  );
}
