"use server";

import { cookies } from "next/headers";
import { cache } from "react";
import { SESSION_COOKIE_NAME } from "../utils/session-cookie";
import { validateSession } from "../session";

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
