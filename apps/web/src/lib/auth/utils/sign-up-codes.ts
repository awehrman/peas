export interface SignUpCode {
  code: string;
  maxUses?: number;
  expiresAt?: Date;
  usedCount?: number;
}

export function validateSignUpCode(
  providedCode: string | undefined,
  allowedCodes: SignUpCode[]
): { isValid: boolean; error?: string } {
  if (!providedCode) {
    return { isValid: false, error: "Sign-up code is required" };
  }

  const matchingCode = allowedCodes.find((code) => code.code === providedCode);

  if (!matchingCode) {
    return { isValid: false, error: "Invalid sign-up code" };
  }

  // Check if code has expired
  if (matchingCode.expiresAt && new Date() > matchingCode.expiresAt) {
    return { isValid: false, error: "Sign-up code has expired" };
  }

  // Check if code has reached max uses
  if (
    matchingCode.maxUses &&
    matchingCode.usedCount &&
    matchingCode.usedCount >= matchingCode.maxUses
  ) {
    return { isValid: false, error: "Sign-up code has reached maximum uses" };
  }

  return { isValid: true };
}

export function getSignUpCodes(): SignUpCode[] {
  // Get codes from environment variables
  const codesString = process.env.SIGN_UP_CODES;

  if (!codesString) {
    return [];
  }

  const parsed = parseSignUpCodesJson(codesString);

  if (parsed) {
    return parsed;
  }

  return codesString
    .split(",")
    .map((code) => code.trim())
    .filter((code) => code.length > 0)
    .map((code) => ({ code }));
}

interface SignUpCodeJson {
  code: string;
  maxUses?: number;
  expiresAt?: string;
  usedCount?: number;
}

function parseSignUpCodesJson(codesString: string): SignUpCode[] | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(codesString);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) {
    return null;
  }

  return (parsed as SignUpCodeJson[])
    .filter((entry) => typeof entry?.code === "string" && entry.code !== "")
    .map(({ expiresAt, ...entry }) => ({
      ...entry,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    }));
}
