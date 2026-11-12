"use server";

import { revalidatePath } from "next/cache";

import { setIngredientLineReviewStatus } from "@peas/database";
import type { LineReviewStatus, MutationResult } from "@peas/features";
import { z } from "zod";

import { notePath } from "@/paths";

import { getAuthOrRedirect } from "../../auth/queries/get-auth-or-redirect";
import { toMutationError } from "../../shared/to-mutation-error";

const inputSchema = z.object({
  lineId: z.string().min(1),
  status: z.enum(["UNREVIEWED", "CORRECT", "INCORRECT"]),
});

export async function setLineReviewStatusAction(
  lineId: string,
  status: LineReviewStatus
): Promise<MutationResult> {
  await getAuthOrRedirect();

  try {
    const input = inputSchema.parse({ lineId, status });
    const line = await setIngredientLineReviewStatus(input.lineId, input.status);
    if (line.noteId) revalidatePath(notePath(line.noteId));
    return { success: true };
  } catch (error) {
    return toMutationError(error);
  }
}
