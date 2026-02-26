import { describe, expect, it } from "vitest";
import { eventCardCatalog, nightEventCards } from "./events";

function deltaMagnitude(card: (typeof nightEventCards)[number]): number {
  const player = Object.values(card.basePlayerDelta).reduce(
    (sum, value) => sum + Math.abs(value ?? 0),
    0
  );
  const camp = Object.values(card.baseCampDelta).reduce(
    (sum, value) => sum + Math.abs(value ?? 0),
    0
  );
  return player + camp;
}

describe("event catalog", () => {
  it("matches requested category counts and total size", () => {
    expect(eventCardCatalog.mundane).toHaveLength(20);
    expect(eventCardCatalog.ambiguous).toHaveLength(15);
    expect(eventCardCatalog.hazard).toHaveLength(10);
    expect(eventCardCatalog.internal).toHaveLength(10);
    expect(eventCardCatalog.shock).toHaveLength(5);
    expect(nightEventCards).toHaveLength(60);
  });

  it("keeps mundane cards low-intensity", () => {
    for (const card of eventCardCatalog.mundane) {
      expect(deltaMagnitude(card)).toBeLessThanOrEqual(4);
      expect(card.tags).toContain("mundane");
    }
  });

  it("keeps shock cards explicitly tagged as rare shocks", () => {
    for (const card of eventCardCatalog.shock) {
      expect(card.tags).toContain("shock");
    }
  });
});
