"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@peas/database";
import { dashboardPath } from "@/paths";
import {
  toActionState,
  ActionState,
  fromErrorToActionState,
} from "@peas/features";
import { verifyPasswordHash } from "../utils/hash-and-verify";
import { generateRandomToken } from "../utils/crypto";
import { createSession } from "../session";
import { setSessionCookie } from "../utils/session-cookie";

const loginSchema = z.object({
  email: z.string().min(1, { message: "Is required" }).max(191).email(),
  password: z.string().min(6).max(191),
});

export const login = async (_actionState: ActionState, formData: FormData) => {
  try {
    const { email, password } = loginSchema.parse(Object.fromEntries(formData));

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return toActionState("ERROR", "Incorrect email or password", formData);
    }

    const validPassword = await verifyPasswordHash(user.passwordHash, password);

    if (!validPassword) {
      return toActionState("ERROR", "Incorrect email or password", formData);
    }

    const sessionToken = generateRandomToken();
    const session = await createSession(sessionToken, user.id);

    await setSessionCookie(sessionToken, session.expiresAt);
  } catch (error) {
    return fromErrorToActionState(error, formData);
  }

  redirect(dashboardPath());
};
