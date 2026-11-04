import { ReactNode } from "react";

import { DesignSystem } from "@peas/features";

import { getAuthOrRedirect } from "../../../lib/auth/queries/get-auth-or-redirect";

export default async function DesignSystemPage(): Promise<ReactNode> {
  await getAuthOrRedirect();

  return (
    <div>
      <DesignSystem />
    </div>
  );
}
