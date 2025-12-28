/**
 * Input Sanitization Utilities
 * Protect against XSS and injection attacks
 */

/**
 * Sanitize text input by removing dangerous characters and HTML tags
 * @param input - Raw user input
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizeText(input: string, maxLength: number = 100): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Remove control characters except newline and tab
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Enforce max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize participant name
 * Allows alphanumeric characters, spaces, and common punctuation
 */
export function sanitizeParticipantName(name: string): string {
  const sanitized = sanitizeText(name, 50);

  // Only allow letters, numbers, spaces, hyphens, apostrophes, periods
  const cleaned = sanitized.replace(/[^a-zA-Z0-9\s\-'\.]/g, '');

  if (!cleaned || cleaned.length < 2) {
    throw new Error('Participant name must be at least 2 characters long');
  }

  if (cleaned.length > 50) {
    throw new Error('Participant name must be less than 50 characters');
  }

  return cleaned.trim();
}

/**
 * Sanitize team name
 * Allows alphanumeric characters, spaces, and common punctuation
 */
export function sanitizeTeamName(name: string): string {
  const sanitized = sanitizeText(name, 30);

  // Only allow letters, numbers, spaces, hyphens, apostrophes
  const cleaned = sanitized.replace(/[^a-zA-Z0-9\s\-']/g, '');

  if (!cleaned || cleaned.length < 2) {
    throw new Error('Team name must be at least 2 characters long');
  }

  if (cleaned.length > 30) {
    throw new Error('Team name must be less than 30 characters');
  }

  return cleaned.trim();
}

/**
 * Sanitize color hex code
 * Ensures valid 6-digit hex color
 */
export function sanitizeHexColor(color: string): string {
  if (typeof color !== 'string') {
    throw new Error('Color must be a string');
  }

  // Remove # if present
  let hex = color.replace(/^#/, '');

  // Only allow hex characters
  hex = hex.replace(/[^0-9A-Fa-f]/g, '');

  if (hex.length !== 6) {
    throw new Error('Color must be a valid 6-digit hex code');
  }

  return `#${hex.toUpperCase()}`;
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    throw new Error('Email must be a string');
  }

  const sanitized = sanitizeText(email.toLowerCase(), 254);

  // Basic email validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }

  return sanitized;
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  if (typeof uuid !== 'string') {
    return false;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
