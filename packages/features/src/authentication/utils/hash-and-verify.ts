export async function verifyPasswordHash(
  hash: string,
  password: string
): Promise<boolean> {
  // TODO: Replace with real hash verification
  return hash === password;
}
