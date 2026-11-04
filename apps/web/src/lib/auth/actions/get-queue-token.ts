"use server";

import { getAuthOrRedirect } from "../queries/get-auth-or-redirect";
import { createQueueToken } from "../utils/queue-token";

export async function getQueueToken(): Promise<string> {
  const { user } = await getAuthOrRedirect();

  return createQueueToken(user.id);
}
