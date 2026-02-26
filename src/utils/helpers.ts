export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function withSign(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }
  return String(value);
}
