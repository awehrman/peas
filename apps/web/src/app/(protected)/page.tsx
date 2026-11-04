import { DashboardPageContent } from "@peas/features";

import { cleanupAllDataAction } from "../../lib/admin/actions/cleanup-all-data";
import { getAuthOrRedirect } from "../../lib/auth/queries/get-auth-or-redirect";

export default async function DashboardPage() {
  const { user } = await getAuthOrRedirect();
  const isAdmin = user.userType === "ADMIN";

  return (
    <DashboardPageContent
      onCleanupAllData={isAdmin ? cleanupAllDataAction : undefined}
    />
  );
}
