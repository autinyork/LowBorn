import { describe, expect, it } from "vitest";
import { createSeededRng } from "./rng";

describe("seeded RNG", () => {
  it("is deterministic for a given string seed", () => {
    const rngA = createSeededRng("determinism-seed");
    const rngB = createSeededRng("determinism-seed");

    const seqA = [
      rngA.nextFloat(),
      rngA.nextFloat(),
      rngA.nextInt(1, 9),
      rngA.nextInt(1, 9),
      rngA.pick(["a", "b", "c", "d"]),
    ];
    const seqB = [
      rngB.nextFloat(),
      rngB.nextFloat(),
      rngB.nextInt(1, 9),
      rngB.nextInt(1, 9),
      rngB.pick(["a", "b", "c", "d"]),
    ];

    expect(seqA).toEqual(seqB);
  });

  it("weightedPick never picks zero-weight entries when positive alternatives exist", () => {
    const rng = createSeededRng("zero-weight-seed");
    for (let i = 0; i < 50; i += 1) {
      const picked = rng.weightedPick([
        { value: "none", weight: 0 },
        { value: "target", weight: 5 },
      ]);
      expect(picked).toBe("target");
    }
  });

  it("weightedPick favors higher weight outcomes", () => {
    const rng = createSeededRng("weighted-bias-seed");
    let low = 0;
    let high = 0;
    for (let i = 0; i < 6000; i += 1) {
      const picked = rng.weightedPick([
        { value: "low", weight: 1 },
        { value: "high", weight: 6 },
      ]);
      if (picked === "high") {
        high += 1;
      } else {
        low += 1;
      }
    }
    expect(high).toBeGreaterThan(low * 3);
  });
});
