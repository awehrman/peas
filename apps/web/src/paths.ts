export const dashboardPath = () => "/";

export const designSystemPath = () => "/design";
export const importPath = () => "/import";

export const loginPath = () => "/login";
export const invitePath = (code?: string) =>
  code ? `/invite/${code}` : "/invite";
export const passwordResetPath = () => "/password-reset";

export const ingredientsPath = () => "/ingredients";
export const ingredientPath = (id: string) => `/ingredients?id=${id}`;
export const notesPath = () => "/notes";
export const notePath = (id: string) => `/notes/${id}`;
export const recipesPath = () => "/recipes";
export const recipePath = (id: string) => `/recipes/${id}`;
