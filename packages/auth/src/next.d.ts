declare module "@peas/auth/next" {
  export const SESSION_COOKIE_NAME: string;
  export const setSessionCookie: (
    sessionToken: string,
    expiresAt: Date
  ) => Promise<void>;
  export const deleteSessionCookie: () => Promise<void>;
}
