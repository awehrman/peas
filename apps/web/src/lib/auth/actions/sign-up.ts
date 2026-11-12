"use server";

import { dashboardPath } from "@/paths";

import { redirect } from "next/navigation";

import { prisma } from "@peas/database";
import {
  ActionState,
  fromErrorToActionState,
  toActionState,
} from "@peas/features";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { createSession } from "../session";
import { generateRandomToken } from "../utils/crypto";
import { hashPassword } from "../utils/hash-and-verify";
import { createPeaAvatarUrl } from "../utils/pea-avatar";
import { setSessionCookie } from "../utils/session-cookie";
import { getSignUpCodes, validateSignUpCode } from "../utils/sign-up-codes";

const signUpSchema = z
  .object({
    code: z.string().optional(),
    username: z
      .string()
      .min(1)
      .max(191)
      .refine(
        (value) => !value.includes(" "),
        "Username cannot contain spaces"
      ),
    email: z.string().min(1, { message: "Is required" }).max(191).email(),
    password: z.string().min(6).max(191),
    confirmPassword: z.string().min(6).max(191),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export const signUp = async (_actionState: ActionState, formData: FormData) => {
  try {
    const { code, username, email, password } = signUpSchema.parse(
      Object.fromEntries(formData)
    );

    const { isValid, error } = validateSignUpCode(code, getSignUpCodes());

    if (!isValid) {
      return toActionState("ERROR", error ?? "Invalid sign-up code", formData);
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        avatarUrl: createPeaAvatarUrl(),
      },
    });

    const sessionToken = generateRandomToken();
    const session = await createSession(sessionToken, user.id);

    await setSessionCookie(sessionToken, session.expiresAt);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return toActionState(
        "ERROR",
        "Either email or username is already in use",
        formData
      );
    }

    return fromErrorToActionState(error, formData);
  }

  redirect(dashboardPath());
};
