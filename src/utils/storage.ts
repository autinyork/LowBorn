import { migrateSavePayload, toSaveEnvelope } from "../game/migrations";
import type { GameState } from "../game/types";
import { z } from "zod";

export const SAVE_KEY = "lowborn.save";
export const SETTINGS_KEY = "lowborn.settings";

export const settingsSchema = z.object({
  compactLog: z.boolean().default(false),
  fontScale: z.enum(["normal", "large"]).default("normal"),
  reduceMotion: z.boolean().default(false),
  highContrast: z.boolean().default(false),
});

export type PersistedSettings = z.infer<typeof settingsSchema>;

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
}

export function loadSave(): GameState | null {
  try {
    const storage = getStorage();
    if (!storage) {
      return null;
    }

    const raw = storage.getItem(SAVE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = migrateSavePayload(JSON.parse(raw));
    if (!parsed) {
      return null;
    }

    if (parsed.migrated) {
      storage.setItem(SAVE_KEY, JSON.stringify(toSaveEnvelope(parsed.gameState)));
    }

    return parsed.gameState;
  } catch {
    return null;
  }
}

export function writeSave(gameState: GameState): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.setItem(SAVE_KEY, JSON.stringify(toSaveEnvelope(gameState)));
}

export function clearSave(): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.removeItem(SAVE_KEY);
}

export function loadSettings(): PersistedSettings | null {
  try {
    const storage = getStorage();
    if (!storage) {
      return null;
    }
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) {
      return null;
    }
    return settingsSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeSettings(settings: PersistedSettings): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.setItem(SETTINGS_KEY, JSON.stringify(settingsSchema.parse(settings)));
}
