import { create } from "zustand";
import {
  beginNight,
  createInitialGameState,
  DEFAULT_SEED,
  resolveNightScene,
  startNextDay,
} from "../game/simulation";
import type { GameState } from "../game/types";
import {
  clearSave,
  loadSave,
  loadSettings,
  writeSave,
  writeSettings,
} from "../utils/storage";

export type AppScreen = "TITLE" | "NEW_RUN" | "SETTINGS" | "GAME" | "RUN_JOURNAL";

interface UiSettings {
  compactLog: boolean;
  fontScale: "normal" | "large";
  reduceMotion: boolean;
  highContrast: boolean;
}

interface GameStore {
  screen: AppScreen;
  run: GameState | null;
  hasSave: boolean;
  seedInput: string;
  settings: UiSettings;
  lastError: string | null;
  openTitle: () => void;
  openNewRun: () => void;
  openSettings: () => void;
  openRunJournal: () => void;
  openGame: () => void;
  continueRun: () => void;
  startNewRun: () => void;
  setSeedInput: (value: string) => void;
  beginNight: () => void;
  resolveNight: (choiceId?: string) => void;
  startNextDay: () => void;
  clearProgress: () => void;
  toggleCompactLog: () => void;
  toggleFontScale: () => void;
  toggleReduceMotion: () => void;
  toggleHighContrast: () => void;
  exportSave: () => string | null;
  importSave: (json: string) => boolean;
  clearError: () => void;
}

const initialSave = loadSave();
const initialSettings = loadSettings() ?? {
  compactLog: false,
  fontScale: "normal" as const,
  reduceMotion: false,
  highContrast: false,
};

function updateSettings(
  current: UiSettings,
  update: Partial<UiSettings>
): UiSettings {
  const next = { ...current, ...update };
  writeSettings(next);
  return next;
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: "TITLE",
  run: initialSave,
  hasSave: Boolean(initialSave),
  seedInput: initialSave?.seed ?? DEFAULT_SEED,
  settings: initialSettings,
  lastError: null,

  openTitle: () => set({ screen: "TITLE" }),
  openNewRun: () => set({ screen: "NEW_RUN" }),
  openSettings: () => set({ screen: "SETTINGS" }),
  openRunJournal: () => {
    try {
      const run = get().run ?? loadSave();
      if (!run) {
        set({ hasSave: false, run: null, screen: "TITLE" });
        return;
      }
      set({
        run,
        hasSave: true,
        screen: "RUN_JOURNAL",
        lastError: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load run journal";
      set({ lastError: message });
    }
  },
  openGame: () => set({ screen: "GAME" }),

  continueRun: () => {
    try {
      const saved = loadSave();
      if (!saved) {
        set({ hasSave: false, run: null, lastError: null });
        return;
      }
      set({
        run: saved,
        hasSave: true,
        seedInput: saved.seed,
        screen: "GAME",
        lastError: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to continue run";
      set({ lastError: message });
    }
  },

  startNewRun: () => {
    try {
      const seed = get().seedInput.trim() || DEFAULT_SEED;
      const run = createInitialGameState(seed);
      writeSave(run);
      set({
        run,
        hasSave: true,
        seedInput: seed,
        screen: "GAME",
        lastError: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start new run";
      set({ lastError: message });
    }
  },

  setSeedInput: (value: string) => set({ seedInput: value }),

  beginNight: () => {
    try {
      const run = get().run;
      if (!run) {
        set({ lastError: "No active run" });
        return;
      }
      const next = beginNight(run);
      writeSave(next);
      set({ run: next, hasSave: true, lastError: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to begin night";
      set({ lastError: message });
    }
  },

  resolveNight: (choiceId) => {
    try {
      const run = get().run;
      if (!run) {
        set({ lastError: "No active run" });
        return;
      }
      const next = resolveNightScene(run, choiceId);
      writeSave(next);
      set({ run: next, hasSave: true, lastError: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resolve night";
      set({ lastError: message });
    }
  },

  startNextDay: () => {
    try {
      const run = get().run;
      if (!run) {
        set({ lastError: "No active run" });
        return;
      }
      const next = startNextDay(run);
      writeSave(next);
      set({ run: next, hasSave: true, lastError: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start next day";
      set({ lastError: message });
    }
  },

  clearProgress: () => {
    try {
      clearSave();
      set({
        run: null,
        hasSave: false,
        screen: "TITLE",
        seedInput: DEFAULT_SEED,
        lastError: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to clear progress";
      set({ lastError: message });
    }
  },

  exportSave: () => {
    try {
      const run = get().run;
      if (!run) {
        set({ lastError: "No active run to export" });
        return null;
      }
      const json = JSON.stringify(run, null, 2);
      return json;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export save";
      set({ lastError: message });
      return null;
    }
  },

  importSave: (json: string) => {
    try {
      const parsed = JSON.parse(json);
      writeSave(parsed);
      set({
        run: parsed,
        hasSave: true,
        seedInput: parsed.seed,
        lastError: null,
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to import save";
      set({ lastError: message });
      return false;
    }
  },

  clearError: () => set({ lastError: null }),

  toggleCompactLog: () =>
    set((state) => ({
      settings: updateSettings(state.settings, {
        compactLog: !state.settings.compactLog,
      }),
    })),

  toggleFontScale: () =>
    set((state) => ({
      settings: updateSettings(state.settings, {
        fontScale: state.settings.fontScale === "normal" ? "large" : "normal",
      }),
    })),

  toggleReduceMotion: () =>
    set((state) => ({
      settings: updateSettings(state.settings, {
        reduceMotion: !state.settings.reduceMotion,
      }),
    })),

  toggleHighContrast: () =>
    set((state) => ({
      settings: updateSettings(state.settings, {
        highContrast: !state.settings.highContrast,
      }),
    })),
}));
