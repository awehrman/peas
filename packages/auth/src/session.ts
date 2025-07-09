import { lucia } from "./lucia.js";

export const createSession = async (sessionToken: string, userId: string) => {
  const session = await lucia.createSession(userId, {
    sessionToken,
  });

  return session;
};

export const validateSession = async (sessionToken: string) => {
  try {
    const { session, user } = await lucia.validateSession(sessionToken);
    return { session, user };
  } catch {
    return { session: null, user: null };
  }
};

export const invalidateSession = async (sessionToken: string) => {
  try {
    await lucia.invalidateSession(sessionToken);
  } catch {
    // Session might already be invalid
  }
};
