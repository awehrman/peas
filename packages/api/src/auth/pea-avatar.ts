import { prisma } from "@peas/database";
import { generateRandomBlobPeaDataUrl } from "@peas/pea-svg-generator";

import type { AuthUser } from "./session";

export function createPeaAvatarUrl(): string {
  return generateRandomBlobPeaDataUrl();
}

/**
 * Returns the user's avatar, assigning them a random pea the first time
 * through so accounts created before avatars existed get one too.
 */
export async function ensurePeaAvatar(
  user: Pick<AuthUser, "id" | "avatarUrl">
): Promise<string> {
  if (user.avatarUrl) return user.avatarUrl;

  const avatarUrl = createPeaAvatarUrl();
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl } });

  return avatarUrl;
}
