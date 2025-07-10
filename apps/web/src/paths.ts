export const dashboardPath = () => "/";

export const designSystemPath = () => "/design";
export const importPath = () => "/import";

export const loginPath = () => "/login";
export const invitePath = (code?: string) =>
  code ? `/invite/${code}` : "/invite";
export const passwordResetPath = () => "/password-reset";

export const ingredientsPath = () => "/ingredients";
export const notesPath = () => "/notes";
export const recipesPath = () => "/recipes";
