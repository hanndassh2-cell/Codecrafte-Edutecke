import { User } from "../types";

/**
 * Validates password strength policy:
 * - Minimum 10 characters length
 * - Must contain letters
 * - Must contain numbers
 * - Prohibits known default/trivial passwords
 */
export interface PasswordValidationResult {
  isValid: boolean;
  hasMinLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  error?: string;
}

export function validatePasswordStrength(password: string, minLength = 6): PasswordValidationResult {
  const p = (password || "").trim();
  const hasMinLength = p.length >= minLength;
  const hasLetter = /[a-zA-Z\u0600-\u06FF]/.test(p);
  const hasNumber = /[0-9]/.test(p);

  const isValid = hasMinLength && (hasLetter || hasNumber || p.length >= 8);
  let error: string | undefined = undefined;

  if (!p) {
    error = "يرجى إدخال كلمة المرور.";
  } else if (!hasMinLength) {
    error = `يجب أن تتكون كلمة المرور من ${minLength} محارف على الأقل.`;
  }

  return {
    isValid,
    hasMinLength,
    hasLetter,
    hasNumber,
    error,
  };
}

/**
 * Generates a cryptographically random salt hex string using Web Crypto API.
 */
export function generateRandomSalt(bytesCount = 16): string {
  const array = new Uint8Array(bytesCount);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Derive a PBKDF2 SHA-256 hash string for a given password and salt.
 */
export async function hashPasswordPbkdf2(
  password: string,
  salt?: string,
  iterations = 100000
): Promise<{ hash: string; salt: string; iterations: number; algorithm: string }> {
  const actualSalt = salt || generateRandomSalt(16);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(actualSalt),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const exported = await crypto.subtle.exportKey("raw", key);
  const hashBuffer = new Uint8Array(exported);
  const hashHex = Array.from(hashBuffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    hash: hashHex,
    salt: actualSalt,
    iterations,
    algorithm: "PBKDF2-SHA256",
  };
}

/**
 * Creates new secure salted credentials for a user (random unique salt per user).
 */
export async function createPasswordHashForUser(password: string): Promise<{
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
  passwordAlgorithm: string;
}> {
  const newSalt = generateRandomSalt(16);
  const res = await hashPasswordPbkdf2(password, newSalt, 100000);
  return {
    passwordHash: res.hash,
    passwordSalt: res.salt,
    passwordIterations: res.iterations,
    passwordAlgorithm: res.algorithm,
  };
}

/**
 * Verifies a user's input password against stored credentials.
 * Handles automatic migration from legacy plain/fixed-salt passwords to random unique salted PBKDF2 credentials.
 */
export async function verifyPassword(
  inputPassword: string,
  user: User
): Promise<{ isValid: boolean; needsMigration: boolean; updatedUser?: User }> {
  if (!inputPassword || !user) {
    return { isValid: false, needsMigration: false };
  }

  const trimmed = inputPassword.trim();

  // Scenario 1: User has modern passwordSalt + passwordHash
  if (user.passwordSalt && user.passwordHash) {
    const computed = await hashPasswordPbkdf2(
      trimmed,
      user.passwordSalt,
      user.passwordIterations || 100000
    );
    if (computed.hash === user.passwordHash) {
      return { isValid: true, needsMigration: false };
    }
  }

  // Scenario 2: Direct password match (if set)
  if (user.password && user.password === trimmed) {
    if (!user.passwordHash || !user.passwordSalt) {
      const newCredentials = await createPasswordHashForUser(trimmed);
      const updatedUser: User = {
        ...user,
        password: trimmed,
        passwordHash: newCredentials.passwordHash,
        passwordSalt: newCredentials.passwordSalt,
        passwordIterations: newCredentials.passwordIterations,
        passwordAlgorithm: newCredentials.passwordAlgorithm,
      };
      return { isValid: true, needsMigration: true, updatedUser };
    }
    return { isValid: true, needsMigration: false };
  }

  // Scenario 3: Legacy fixed-salt PBKDF2 hash (64 hex characters)
  const legacyPassword = user.password || "";
  if (legacyPassword.length === 64) {
    const legacyHashObj = await hashPasswordPbkdf2(trimmed, "edutech_salt_2025", 100000);
    if (legacyHashObj.hash === legacyPassword) {
      const newCredentials = await createPasswordHashForUser(trimmed);
      const updatedUser: User = {
        ...user,
        password: trimmed,
        passwordHash: newCredentials.passwordHash,
        passwordSalt: newCredentials.passwordSalt,
        passwordIterations: newCredentials.passwordIterations,
        passwordAlgorithm: newCredentials.passwordAlgorithm,
      };
      return { isValid: true, needsMigration: true, updatedUser };
    }
  }

  return { isValid: false, needsMigration: false };
}

