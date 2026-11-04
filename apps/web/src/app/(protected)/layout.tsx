import { ReactNode } from "react";

import { AuthenticatedLayout } from "../../lib/auth/components/authenticated-layout";
import { getAuthOrRedirect } from "../../lib/auth/queries/get-auth-or-redirect";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await getAuthOrRedirect();

  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
