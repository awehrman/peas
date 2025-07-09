export function generateRandomToken(): string {
  // TODO: Replace with a secure random token generator
  return Math.random().toString(36).slice(2);
}
