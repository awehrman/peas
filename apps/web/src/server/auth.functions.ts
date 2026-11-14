import {
  type CredentialResult,
  SESSION_COOKIE_NAME,
  createQueueToken,
  ensurePeaAvatar,
  expiredSessionCookieOptions,
  getSignUpCodes,
  hashToken,
  invalidateSession,
  loginWithPassword,
  sessionCookieOptions,
  signUpWithCode,
  validateSession,
  validateSignUpCode,
} from "@peas/api/auth";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";

/** What the app shell needs about the signed-in user. */
export interface ViewerSummary {
  id: string;
  username: string;
  avatarUrl: string;
  isAdmin: boolean;
}

/** Serializable result of a credential form; the client re-attaches the submitted FormData for redisplay. */
export interface CredentialFormState {
  status: "SUCCESS" | "ERROR";
  message: string;
  fieldErrors: Record<string, string[] | undefined>;
}

function clearSessionCookie(): void {
  setCookie(SESSION_COOKIE_NAME, "", expiredSessionCookieOptions());
}

/**
 * The signed-in user, or null. Also re-sends the session cookie so a session extended by `validateSession` keeps its new expiry, and assigns a pea avatar to accounts without one.
 *
 * @example
 * beforeLoad: async () => { const viewer = await getViewerFn(); if (!viewer) throw redirect({ to: "/login" }); return { viewer }; }
 */
export const getViewerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<ViewerSummary | null> => {
    const token = getCookie(SESSION_COOKIE_NAME);
    if (!token) return null;

    const { session, user } = await validateSession(token);
    if (!session) {
      clearSessionCookie();
      return null;
    }

    setCookie(
      SESSION_COOKIE_NAME,
      token,
      sessionCookieOptions(session.expiresAt)
    );
    const avatarUrl = await ensurePeaAvatar(user);
    return {
      id: user.id,
      username: user.username,
      avatarUrl,
      isAdmin: user.userType === "ADMIN",
    };
  }
);

function formFields(data: unknown): Record<string, string> {
  if (!(data instanceof FormData)) throw new Error("Expected form data");
  const fields: Record<string, string> = {};
  data.forEach((value, key) => {
    if (typeof value === "string") fields[key] = value;
  });
  return fields;
}

function finishCredentials(result: CredentialResult): CredentialFormState {
  if (result.status === "ERROR") return result;
  setCookie(
    SESSION_COOKIE_NAME,
    result.sessionToken,
    sessionCookieOptions(result.expiresAt)
  );
  return { status: "SUCCESS", message: "", fieldErrors: {} };
}

/**
 * @example
 * const state = await loginFn({ data: formData }); // { status: "ERROR", message: "Incorrect email or password", fieldErrors: {} }
 */
export const loginFn = createServerFn({ method: "POST" })
  .validator(formFields)
  .handler(async ({ data }) =>
    finishCredentials(await loginWithPassword(data))
  );

export const signUpFn = createServerFn({ method: "POST" })
  .validator(formFields)
  .handler(async ({ data }) => finishCredentials(await signUpWithCode(data)));

export const signOutFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const token = getCookie(SESSION_COOKIE_NAME);
    if (token) await invalidateSession(hashToken(token));
    clearSessionCookie();
  }
);

/** Short-lived token the browser sends to the queue service for uploads and websocket updates. */
export const getQueueTokenFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<string> => {
    const token = getCookie(SESSION_COOKIE_NAME);
    const { user } = token ? await validateSession(token) : { user: null };
    if (!user) throw new Error("You must be signed in");
    return createQueueToken(user.id);
  }
);

/**
 * Checks an invite code before showing the sign-up form.
 *
 * @example
 * await checkInviteFn({ data: "spring-2026" }) // { isValid: true } or { isValid: false, error: "Sign-up is currently closed" }
 */
export const checkInviteFn = createServerFn({ method: "GET" })
  .validator((code: unknown) => (typeof code === "string" ? code : ""))
  .handler(
    async ({ data: code }): Promise<{ isValid: boolean; error?: string }> => {
      const allowedCodes = getSignUpCodes();
      if (allowedCodes.length === 0)
        return { isValid: false, error: "Sign-up is currently closed" };
      return validateSignUpCode(code, allowedCodes);
    }
  );
