import { Prisma, prisma } from "@peas/database";
import { z } from "zod";

import { generateRandomToken } from "./crypto";
import { hashPassword, verifyPasswordHash } from "./password";
import { createPeaAvatarUrl } from "./pea-avatar";
import { createSession } from "./session";
import { getSignUpCodes, validateSignUpCode } from "./sign-up-codes";

/**
 * Serializable outcome of a credential form. Successful results carry the raw
 * session token for the host app to place in the session cookie.
 */
export type CredentialResult =
  | { status: "SUCCESS"; sessionToken: string; expiresAt: Date }
  | {
      status: "ERROR";
      message: string;
      fieldErrors: Record<string, string[] | undefined>;
    };

const loginSchema = z.object({
  email: z.string().min(1, { message: "Is required" }).max(191).email(),
  password: z.string().min(6).max(191),
});

const signUpSchema = z
  .object({
    code: z.string().optional(),
    username: z
      .string()
      .min(1)
      .max(191)
      .refine((value) => !value.includes(" "), "Username cannot contain spaces"),
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

export type LoginInput = z.input<typeof loginSchema>;
export type SignUpInput = z.input<typeof signUpSchema>;

const INCORRECT_CREDENTIALS = "Incorrect email or password";

export async function loginWithPassword(
  input: unknown
): Promise<CredentialResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return errorResult(INCORRECT_CREDENTIALS);

  const isValidPassword = await verifyPasswordHash(user.passwordHash, password);
  if (!isValidPassword) return errorResult(INCORRECT_CREDENTIALS);

  return startSession(user.id);
}

export async function signUpWithCode(input: unknown): Promise<CredentialResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { code, username, email, password } = parsed.data;
  const { isValid, error } = validateSignUpCode(code, getSignUpCodes());
  if (!isValid) return errorResult(error ?? "Invalid sign-up code");

  try {
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: await hashPassword(password),
        avatarUrl: createPeaAvatarUrl(),
      },
    });

    return startSession(user.id);
  } catch (caught) {
    if (
      caught instanceof Prisma.PrismaClientKnownRequestError &&
      caught.code === "P2002"
    ) {
      return errorResult("Either email or username is already in use");
    }
    throw caught;
  }
}

async function startSession(userId: string): Promise<CredentialResult> {
  const sessionToken = generateRandomToken();
  const session = await createSession(sessionToken, userId);
  return { status: "SUCCESS", sessionToken, expiresAt: session.expiresAt };
}

function errorResult(message: string): CredentialResult {
  return { status: "ERROR", message, fieldErrors: {} };
}

function fromZodError(error: z.ZodError): CredentialResult {
  return {
    status: "ERROR",
    message: "",
    fieldErrors: z.flattenError(error).fieldErrors,
  };
}
