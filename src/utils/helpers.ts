/**
 * Clamps a number between min and max values
 * Used throughout game to keep stats within valid ranges (0-100)
 * @param value - The value to clamp
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @returns The clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Formats a number as a signed string for UI display
 * @param value - The value to format
 * @returns String like "+5" or "-3" or "0"
 */
export function withSign(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }
  return String(value);
}
