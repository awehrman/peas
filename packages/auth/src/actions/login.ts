"use server";

import {
  ActionState,
  fromErrorToActionState,
  toActionState,
} from "@peas/features";
import { z } from "zod";
import { prisma } from "@peas/database";
import { verifyPasswordHash } from "../utils/hash-and-verify";
import { generateRandomToken } from "../utils/crypto";
import { setSessionCookie } from "../utils/next";
import { createSession } from "../lucia";

const loginSchema = z.object({
  email: z.string().min(1, { message: "Is required" }).max(191).email(),
  password: z.string().min(6).max(191),
});

export const login = async (
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> => {
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

    return toActionState("SUCCESS", "Logged in successfully!", formData);
  } catch (error) {
    return fromErrorToActionState(error, formData);
  }
};
