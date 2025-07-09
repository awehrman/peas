"use server";

import { z } from "zod";
import { ActionState, fromErrorToActionState, toActionState } from "../../form";

const signUpSchema = z
  .object({
    username: z
      .string()
      .min(1)
      .max(191)
      .refine(
        (value) => !value.includes(" "),
        "Username cannot contain spaces"
      ),
    email: z.string().min(1, { message: "Is required" }).max(191).email(),
    password: z.string().min(8).max(191),
    confirmPassword: z.string().min(8).max(191),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export const signUp = async (_actionState: ActionState, formData: FormData) => {
  try {
    const { username, email, password } = signUpSchema.parse(
      Object.fromEntries(formData)
    );
    console.log({ username, email, password });
  } catch (error) {
    return fromErrorToActionState(error, formData);
  }

  return toActionState("SUCCESS", "Sign up successful");
};
