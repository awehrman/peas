import {
  dashboardPath,
  designSystemPath,
  importPath,
  loginPath,
  invitePath,
  passwordResetPath,
  ingredientsPath,
  notesPath,
  recipesPath,
} from "../../paths";

export const PROTECTED_ROUTES = [
  dashboardPath(),
  importPath(),
  ingredientsPath(),
  notesPath(),
  recipesPath(),
  designSystemPath(),
] as const;

export const PUBLIC_ROUTES = [
  loginPath(),
  invitePath(),
  passwordResetPath(),
] as const;

export type ProtectedRoute = (typeof PROTECTED_ROUTES)[number];
export type PublicRoute = (typeof PUBLIC_ROUTES)[number];
