/**
 * Generate a unique alphanumeric game token
 * Format: 6-8 uppercase alphanumeric characters (e.g., "A3X9K2", "B7M4P1Q8")
 *
 * @param length - Token length (default: 6, max: 8)
 * @returns Uppercase alphanumeric token string
 */
export function generateGameToken(length: number = 6): string {
  if (length < 6 || length > 8) {
    throw new Error('Token length must be between 6 and 8 characters');
  }

  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    token += characters[randomIndex];
  }

  return token;
}

/**
 * Generate a cryptographically secure random token (uses Web Crypto API)
 * More secure than Math.random() for production use
 *
 * @param length - Token length (default: 6, max: 8)
 * @returns Uppercase alphanumeric token string
 */
export function generateSecureGameToken(length: number = 6): string {
  if (length < 6 || length > 8) {
    throw new Error('Token length must be between 6 and 8 characters');
  }

  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const charactersLength = characters.length;

  // Use crypto.getRandomValues for secure randomness
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  let token = '';
  for (let i = 0; i < length; i++) {
    // Map random byte to character index
    const index = randomValues[i] % charactersLength;
    token += characters[index];
  }

  return token;
}

/**
 * Generate a unique game token with uniqueness check
 * Attempts to generate until a unique token is found or max attempts reached
 *
 * @param existingTokens - Set of existing tokens to check against
 * @param length - Token length (default: 6)
 * @param maxAttempts - Maximum generation attempts (default: 100)
 * @returns Unique token or throws error if cannot generate unique token
 */
export function generateUniqueGameToken(
  existingTokens: Set<string>,
  length: number = 6,
  maxAttempts: number = 100
): string {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const token = generateSecureGameToken(length);

    if (!existingTokens.has(token)) {
      return token;
    }

    attempts++;
  }

  throw new Error(
    `Failed to generate unique token after ${maxAttempts} attempts. Consider increasing token length.`
  );
}

/**
 * Validate game token format
 * @param token - Token to validate
 * @returns true if token is valid format
 */
export function isValidToken(token: string): boolean {
  return /^[A-Z0-9]{6,8}$/.test(token);
}
