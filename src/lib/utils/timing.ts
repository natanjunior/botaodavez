/**
 * Timing utilities for round countdown and reaction time measurement
 * Provides millisecond-precision timing for fair gameplay
 */

/**
 * Generate random countdown duration for round
 * Range: 1000-5000 milliseconds (1-5 seconds)
 *
 * @returns Random countdown duration in milliseconds
 */
export function generateCountdownDuration(): number {
  const MIN_DURATION = 1000; // 1 second
  const MAX_DURATION = 5000; // 5 seconds

  return Math.floor(Math.random() * (MAX_DURATION - MIN_DURATION + 1)) + MIN_DURATION;
}

/**
 * Get current timestamp in ISO 8601 format
 * @returns ISO timestamp string
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Get current high-resolution timestamp in milliseconds
 * Uses performance.now() for sub-millisecond precision
 *
 * @returns Timestamp in milliseconds (from page load)
 */
export function getHighResolutionTimestamp(): number {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  }
  // Fallback to Date.now() if performance.now() not available
  return Date.now();
}

/**
 * Calculate elapsed time between two timestamps
 * @param startTime - Start timestamp in milliseconds
 * @param endTime - End timestamp in milliseconds (default: now)
 * @returns Elapsed time in milliseconds
 */
export function calculateElapsedTime(startTime: number, endTime: number = Date.now()): number {
  return endTime - startTime;
}

/**
 * Format milliseconds to seconds with decimal places
 * @param milliseconds - Time in milliseconds
 * @param decimalPlaces - Number of decimal places (default: 3)
 * @returns Formatted string (e.g., "2.350s")
 */
export function formatMillisecondsToSeconds(milliseconds: number, decimalPlaces: number = 3): string {
  const seconds = milliseconds / 1000;
  return `${seconds.toFixed(decimalPlaces)}s`;
}

/**
 * Format milliseconds for display
 * @param milliseconds - Time in milliseconds
 * @returns Formatted string (e.g., "2350ms" or "2.35s")
 */
export function formatReactionTime(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  return formatMillisecondsToSeconds(milliseconds, 2);
}

/**
 * Validate reaction time is within reasonable bounds
 * Human reaction time typically 150-300ms, but allow wider range
 *
 * @param reactionTime - Reaction time in milliseconds
 * @returns true if reaction time is valid (50ms - 10000ms)
 */
export function isValidReactionTime(reactionTime: number): boolean {
  const MIN_REACTION_TIME = 50; // Minimum plausible reaction time
  const MAX_REACTION_TIME = 10000; // Maximum allowed (10 seconds)

  return reactionTime >= MIN_REACTION_TIME && reactionTime <= MAX_REACTION_TIME;
}

/**
 * Detect if reaction time is suspiciously fast (possible cheating)
 * @param reactionTime - Reaction time in milliseconds
 * @returns true if reaction time is suspiciously fast (< 100ms)
 */
export function isSuspiciouslyFast(reactionTime: number): boolean {
  const SUSPICIOUS_THRESHOLD = 100; // Less than 100ms is suspicious
  return reactionTime < SUSPICIOUS_THRESHOLD;
}

/**
 * Compare reaction times and determine winner(s)
 * Handles ties by returning all participants with the lowest time
 *
 * @param reactionTimes - Map of participant IDs to their reaction times
 * @returns Array of winner participant IDs (may be multiple if tied)
 */
export function determineWinners(reactionTimes: Map<string, number>): string[] {
  if (reactionTimes.size === 0) {
    return [];
  }

  // Find minimum reaction time
  const minTime = Math.min(...Array.from(reactionTimes.values()));

  // Get all participants with the minimum time (handles ties)
  const winners: string[] = [];
  for (const [participantId, time] of reactionTimes.entries()) {
    if (time === minTime) {
      winners.push(participantId);
    }
  }

  return winners;
}

/**
 * Create a delay promise for testing/simulation
 * @param milliseconds - Delay duration in milliseconds
 * @returns Promise that resolves after the delay
 */
export function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Sync server timestamp with client
 * Calculate offset for accurate countdown synchronization
 *
 * @param serverTimestamp - Server timestamp in ISO format
 * @returns Offset in milliseconds (positive if server is ahead)
 */
export function calculateServerOffset(serverTimestamp: string): number {
  const serverTime = new Date(serverTimestamp).getTime();
  const clientTime = Date.now();
  return serverTime - clientTime;
}
