/**
 * Persistent storage utilities for game saves and settings
 * Uses localStorage as backend; gracefully handles when unavailable (SSR)
 */

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

/**
 * Load the most recent saved game state
 * Handles migrations for backward compatibility with older save formats
 * @returns The loaded GameState or null if no save exists or load fails
 */
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

/**
 * Save the current game state to localStorage
 * Wrapped with envelope for versioning support
 * @param gameState - The state to persist
 */
export function writeSave(gameState: GameState): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.setItem(SAVE_KEY, JSON.stringify(toSaveEnvelope(gameState)));
}

/**
 * Delete the saved game state
 */
export function clearSave(): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.removeItem(SAVE_KEY);
}

/**
 * Load user settings with defaults
 * @returns User settings or null if no settings have been saved
 */
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

/**
 * Persist user settings to localStorage
 * @param settings - The settings object to save
 */
export function writeSettings(settings: PersistedSettings): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.setItem(SETTINGS_KEY, JSON.stringify(settingsSchema.parse(settings)));
}
