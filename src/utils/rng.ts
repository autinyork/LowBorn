export interface WeightedEntry<T> {
  value: T;
  weight: number;
}

export interface SeededRng {
  nextFloat: () => number;
  nextInt: (min: number, max: number) => number;
  pick: <T>(values: readonly T[]) => T;
  weightedPick: <T>(entries: readonly WeightedEntry<T>[]) => T;
}

function hashString(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRng(seedInput: string): SeededRng {
  const seed = seedInput.trim() || "lowborn-default-seed";
  let state = hashString(seed) || 1;

  const nextFloat = (): number => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const nextInt = (min: number, max: number): number => {
    const low = Math.ceil(Math.min(min, max));
    const high = Math.floor(Math.max(min, max));
    return Math.floor(nextFloat() * (high - low + 1)) + low;
  };

  const pick = <T>(values: readonly T[]): T => {
    if (values.length === 0) {
      throw new Error("pick() requires at least one value.");
    }
    return values[nextInt(0, values.length - 1)]!;
  };

  const weightedPick = <T>(entries: readonly WeightedEntry<T>[]): T => {
    if (entries.length === 0) {
      throw new Error("weightedPick() requires at least one entry.");
    }
    const totalWeight = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
    if (totalWeight <= 0) {
      throw new Error("weightedPick() requires a positive total weight.");
    }
    let threshold = nextFloat() * totalWeight;
    for (const entry of entries) {
      const weight = Math.max(0, entry.weight);
      threshold -= weight;
      if (threshold <= 0) {
        return entry.value;
      }
    }
    return entries[entries.length - 1]!.value;
  };

  return {
    nextFloat,
    nextInt,
    pick,
    weightedPick,
  };
}
