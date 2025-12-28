import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

/**
 * Get the current authenticated admin session (server-side)
 * @returns Admin session or null if not authenticated
 */
export async function getAdminSession() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}

/**
 * Get the current authenticated admin user (server-side)
 * @returns Admin user object or null if not authenticated
 */
export async function getAdminUser() {
  const session = await getAdminSession();
  return session?.user ?? null;
}

/**
 * Verify if the current user is authenticated as admin
 * @returns true if authenticated, false otherwise
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const session = await getAdminSession();
  return session !== null;
}

/**
 * Require admin authentication - throws error if not authenticated
 * Use in API routes that require authentication
 * @throws Error if not authenticated
 */
export async function requireAdminAuth() {
  const session = await getAdminSession();

  if (!session) {
    throw new Error('Unauthorized: Admin authentication required');
  }

  return session;
}

/**
 * Verify game token format
 * @param token - Game token to verify
 * @returns true if token format is valid (6-8 uppercase alphanumeric)
 */
export function isValidGameToken(token: string): boolean {
  return /^[A-Z0-9]{6,8}$/.test(token);
}

/**
 * Validate participant name
 * @param name - Participant name to validate
 * @returns true if name is valid (1-100 chars, no special characters)
 */
export function isValidParticipantName(name: string): boolean {
  if (!name || name.trim().length === 0 || name.length > 100) {
    return false;
  }

  // Allow letters, numbers, spaces, and basic punctuation
  // Prevent special characters that could cause XSS
  return /^[a-zA-ZÀ-ÿ0-9\s\-.']+$/.test(name);
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns true if email format is valid
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate hex color format
 * @param color - Color hex string to validate
 * @returns true if color is valid hex format (#RRGGBB)
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}
