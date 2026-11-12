import { GraphQLError } from "graphql";

import type { AuthUser } from "./auth/session";

export interface ApiContext {
  viewer: AuthUser | null;
}

export const UNAUTHENTICATED = "UNAUTHENTICATED";
export const FORBIDDEN = "FORBIDDEN";

export function requireViewer(context: ApiContext): AuthUser {
  if (!context.viewer) {
    throw new GraphQLError("You must be signed in", {
      extensions: { code: UNAUTHENTICATED },
    });
  }
  return context.viewer;
}

export function isAdmin(viewer: AuthUser): boolean {
  return viewer.userType === "ADMIN";
}
