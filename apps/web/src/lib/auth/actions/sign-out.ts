"use server";

import { redirect } from "next/navigation";
import { loginPath } from "@/paths";
import { invalidateSession } from "../session";
import { getAuth } from "../queries/get-auth";
import { deleteSessionCookie } from "../utils/session-cookie";

export const signOut = async () => {
  const { session } = await getAuth();

  if (!session) {
    redirect(loginPath());
  }

  await invalidateSession(session.id);
  await deleteSessionCookie();

  redirect(loginPath());
};
