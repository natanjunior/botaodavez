/**
 * Input validation and sanitization utilities
 * Prevents XSS, injection attacks, and invalid data
 */

/**
 * Sanitize string input to prevent XSS attacks
 * Removes HTML tags and encodes special characters
 *
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (!input) return '';

  return input
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize participant name
 * Allows letters, numbers, spaces, and basic punctuation
 * Prevents special characters that could cause XSS
 *
 * @param name - Participant name to sanitize
 * @returns Sanitized name or throws error if invalid
 */
export function sanitizeParticipantName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Name is required and must be a string');
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    throw new Error('Name cannot be empty');
  }

  if (trimmed.length > 100) {
    throw new Error('Name must be 100 characters or less');
  }

  // Allow only safe characters: letters (including accented), numbers, spaces, hyphens, apostrophes, periods
  if (!/^[a-zA-ZÀ-ÿ0-9\s\-.']+$/.test(trimmed)) {
    throw new Error(
      'Name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods'
    );
  }

  return trimmed;
}

/**
 * Sanitize team name
 * Similar to participant name but may have different rules
 *
 * @param name - Team name to sanitize
 * @returns Sanitized team name
 */
export function sanitizeTeamName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Team name is required and must be a string');
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    throw new Error('Team name cannot be empty');
  }

  if (trimmed.length > 100) {
    throw new Error('Team name must be 100 characters or less');
  }

  // Allow only safe characters
  if (!/^[a-zA-ZÀ-ÿ0-9\s\-.']+$/.test(trimmed)) {
    throw new Error(
      'Team name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods'
    );
  }

  return trimmed;
}

/**
 * Validate and sanitize hex color code
 * @param color - Color hex string to validate
 * @returns Validated hex color in uppercase
 * @throws Error if color is invalid
 */
export function validateHexColor(color: string): string {
  if (!color || typeof color !== 'string') {
    throw new Error('Color is required and must be a string');
  }

  const trimmed = color.trim().toUpperCase();

  if (!/^#[0-9A-F]{6}$/.test(trimmed)) {
    throw new Error('Color must be a valid hex color code (e.g., #FF0000)');
  }

  return trimmed;
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns Validated email in lowercase
 * @throws Error if email is invalid
 */
export function validateEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required and must be a string');
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length === 0) {
    throw new Error('Email cannot be empty');
  }

  if (trimmed.length > 255) {
    throw new Error('Email must be 255 characters or less');
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error('Invalid email format');
  }

  return trimmed;
}

/**
 * Validate game token format
 * @param token - Game token to validate
 * @returns Validated token in uppercase
 * @throws Error if token is invalid
 */
export function validateGameToken(token: string): string {
  if (!token || typeof token !== 'string') {
    throw new Error('Game token is required and must be a string');
  }

  const trimmed = token.trim().toUpperCase();

  if (!/^[A-Z0-9]{6,8}$/.test(trimmed)) {
    throw new Error('Game token must be 6-8 uppercase alphanumeric characters');
  }

  return trimmed;
}

/**
 * Validate UUID format
 * @param uuid - UUID string to validate
 * @returns Validated UUID
 * @throws Error if UUID is invalid
 */
export function validateUUID(uuid: string): string {
  if (!uuid || typeof uuid !== 'string') {
    throw new Error('ID is required and must be a string');
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(uuid)) {
    throw new Error('Invalid ID format');
  }

  return uuid.toLowerCase();
}

/**
 * Validate reaction time value
 * @param reactionTime - Reaction time in milliseconds
 * @returns Validated reaction time
 * @throws Error if reaction time is invalid
 */
export function validateReactionTime(reactionTime: number): number {
  if (typeof reactionTime !== 'number' || isNaN(reactionTime)) {
    throw new Error('Reaction time must be a number');
  }

  if (reactionTime < 0) {
    throw new Error('Reaction time cannot be negative');
  }

  if (reactionTime > 10000) {
    throw new Error('Reaction time too large (max 10000ms)');
  }

  return Math.floor(reactionTime); // Ensure integer
}

/**
 * Validate countdown duration
 * @param duration - Countdown duration in milliseconds
 * @returns Validated duration
 * @throws Error if duration is invalid
 */
export function validateCountdownDuration(duration: number): number {
  if (typeof duration !== 'number' || isNaN(duration)) {
    throw new Error('Countdown duration must be a number');
  }

  if (duration < 1000 || duration > 5000) {
    throw new Error('Countdown duration must be between 1000-5000 milliseconds');
  }

  return Math.floor(duration); // Ensure integer
}

/**
 * Validate round status
 * @param status - Round status to validate
 * @returns Validated status
 * @throws Error if status is invalid
 */
export function validateRoundStatus(status: string): 'waiting' | 'in_progress' | 'completed' {
  const validStatuses = ['waiting', 'in_progress', 'completed'] as const;

  if (!validStatuses.includes(status as any)) {
    throw new Error(`Invalid round status. Must be one of: ${validStatuses.join(', ')}`);
  }

  return status as 'waiting' | 'in_progress' | 'completed';
}

/**
 * Escape SQL-like characters to prevent injection
 * Note: When using Supabase client, parameterized queries handle this automatically
 * This is a defensive utility for edge cases
 *
 * @param input - String to escape
 * @returns Escaped string
 */
export function escapeSQLLike(input: string): string {
  return input.replace(/[%_]/g, '\\$&');
}

/**
 * Validate and sanitize object fields
 * Useful for validating API request bodies
 *
 * @param obj - Object to validate
 * @param requiredFields - Array of required field names
 * @throws Error if required fields are missing
 */
export function validateRequiredFields(obj: Record<string, any>, requiredFields: string[]): void {
  const missing = requiredFields.filter((field) => !(field in obj) || obj[field] === undefined || obj[field] === null);

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}
