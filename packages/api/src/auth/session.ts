import { type Prisma, prisma } from "@peas/database";

import { hashToken } from "./crypto";

const SESSION_REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 24 * 15; // 15 days
const SESSION_MAX_DURATION_MS = SESSION_REFRESH_INTERVAL_MS * 2; // 30 days

const authUserSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  avatarUrl: true,
  userType: true,
} satisfies Prisma.UserSelect;

export type AuthUser = Prisma.UserGetPayload<{ select: typeof authUserSelect }>;

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
}

export type SessionValidationResult =
  | { session: AuthSession; user: AuthUser }
  | { session: null; user: null };

export async function createSession(
  sessionToken: string,
  userId: string
): Promise<AuthSession> {
  const session: AuthSession = {
    id: hashToken(sessionToken),
    userId,
    expiresAt: new Date(Date.now() + SESSION_MAX_DURATION_MS),
  };

  await prisma.session.create({ data: session });

  return session;
}

/**
 * Resolves a session token to its user. Expired sessions are deleted; sessions
 * within the refresh window are extended, so callers should re-send the cookie
 * with the returned expiry.
 */
export async function validateSession(
  sessionToken: string
): Promise<SessionValidationResult> {
  const sessionId = hashToken(sessionToken);

  const result = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: { select: authUserSelect } },
  });

  if (!result) return { session: null, user: null };

  const { user, ...session } = result;

  if (Date.now() >= session.expiresAt.getTime()) {
    await prisma.session.delete({ where: { id: sessionId } });
    return { session: null, user: null };
  }

  if (Date.now() >= session.expiresAt.getTime() - SESSION_REFRESH_INTERVAL_MS) {
    session.expiresAt = new Date(Date.now() + SESSION_MAX_DURATION_MS);
    await prisma.session.update({
      where: { id: sessionId },
      data: { expiresAt: session.expiresAt },
    });
  }

  return {
    session: {
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt,
    },
    user,
  };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}
