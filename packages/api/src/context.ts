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

/** Who may curate food knowledge: Teach Peas, concepts, the lexicon, corpus health, and the grammar loop. Open to every signed-in user for now; return `isAdmin(viewer)` to restrict it again. */
export function canCurateKnowledge(_viewer: AuthUser): boolean {
  return true;
}
