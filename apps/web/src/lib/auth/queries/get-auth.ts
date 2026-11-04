import { cache } from "react";

import { cookies } from "next/headers";

import "server-only";

import { validateSession } from "../session";
import { SESSION_COOKIE_NAME } from "../utils/session-cookie";

export const getAuth = cache(async () => {
  const sessionToken =
    (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null;

  if (!sessionToken) {
    return {
      user: null,
      session: null,
    };
  }

  return await validateSession(sessionToken);
});
