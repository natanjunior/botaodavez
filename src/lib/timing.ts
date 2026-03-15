// src/lib/timing.ts
export function generateYellowDuration(): number {
  return Math.floor(Math.random() * (3500 - 1500 + 1)) + 1500
}

export function calculateYellowEndsAt(yellowDurationMs: number): Date {
  return new Date(Date.now() + yellowDurationMs)
}

export function calculateRemainingYellow(yellowEndsAt: Date): number {
  return Math.max(0, yellowEndsAt.getTime() - Date.now())
}
