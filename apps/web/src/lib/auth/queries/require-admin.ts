import { redirect } from "next/navigation";

import { dashboardPath } from "@/paths";

import { getAuthOrRedirect } from "./get-auth-or-redirect";

export class AdminRequiredError extends Error {
  constructor() {
    super("Only admins can perform this action");
    this.name = "AdminRequiredError";
  }
}

/**
 * Page guard: sends non-admins back to the dashboard.
 */
export const requireAdminOrRedirect = async () => {
  const auth = await getAuthOrRedirect();

  if (auth.user.userType !== "ADMIN") {
    redirect(dashboardPath());
  }

  return auth;
};

/**
 * Server action guard: throws so callers can surface a readable error.
 */
export const requireAdmin = async () => {
  const auth = await getAuthOrRedirect();

  if (auth.user.userType !== "ADMIN") {
    throw new AdminRequiredError();
  }

  return auth;
};
