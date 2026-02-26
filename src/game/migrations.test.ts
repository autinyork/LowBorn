import { describe, expect, it } from "vitest";
import { migrateSavePayload, toSaveEnvelope } from "./migrations";
import { createInitialGameState } from "./simulation";

describe("save migrations", () => {
  it("loads current envelope without migration", () => {
    const state = createInitialGameState("migration-current-seed");
    const envelope = toSaveEnvelope(state);

    const migrated = migrateSavePayload(envelope);
    expect(migrated).not.toBeNull();
    expect(migrated?.migrated).toBe(false);
    expect(migrated?.gameState.seed).toBe(state.seed);
    expect(migrated?.gameState.schedule).toHaveLength(7);
  });

  it("upgrades v5 envelopes and preserves run continuity", () => {
    const state = createInitialGameState("migration-v5-seed");
    const v5Like = {
      version: 5 as const,
      savedAt: new Date().toISOString(),
      gameState: {
        ...state,
        hidden: {
          ...state.hidden,
        },
      },
    };
    delete (v5Like.gameState.hidden as { intenseStreak?: number }).intenseStreak;
    delete (v5Like.gameState as { weekSummary?: unknown }).weekSummary;

    const migrated = migrateSavePayload(v5Like);
    expect(migrated).not.toBeNull();
    expect(migrated?.migrated).toBe(true);
    expect(migrated?.gameState.seed).toBe(state.seed);
    expect(migrated?.gameState.schedule).toHaveLength(7);
    expect(migrated?.gameState.hidden.intenseStreak).toBe(0);
    expect(migrated?.gameState.weekSummary).toBeNull();
  });
});
