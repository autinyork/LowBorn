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

  openTitle: () => set({ screen: "TITLE" }),
  openNewRun: () => set({ screen: "NEW_RUN" }),
  openSettings: () => set({ screen: "SETTINGS" }),
  openRunJournal: () => {
    const run = get().run ?? loadSave();
    if (!run) {
      set({ hasSave: false, run: null, screen: "TITLE" });
      return;
    }
    set({
      run,
      hasSave: true,
      screen: "RUN_JOURNAL",
    });
  },
  openGame: () => set({ screen: "GAME" }),

  continueRun: () => {
    const saved = loadSave();
    if (!saved) {
      set({ hasSave: false, run: null });
      return;
    }
    set({
      run: saved,
      hasSave: true,
      seedInput: saved.seed,
      screen: "GAME",
    });
  },

  startNewRun: () => {
    const seed = get().seedInput.trim() || DEFAULT_SEED;
    const run = createInitialGameState(seed);
    writeSave(run);
    set({
      run,
      hasSave: true,
      seedInput: seed,
      screen: "GAME",
    });
  },

  setSeedInput: (value: string) => set({ seedInput: value }),

  beginNight: () => {
    const run = get().run;
    if (!run) {
      return;
    }
    const next = beginNight(run);
    writeSave(next);
    set({ run: next, hasSave: true });
  },

  resolveNight: (choiceId) => {
    const run = get().run;
    if (!run) {
      return;
    }
    const next = resolveNightScene(run, choiceId);
    writeSave(next);
    set({ run: next, hasSave: true });
  },

  startNextDay: () => {
    const run = get().run;
    if (!run) {
      return;
    }
    const next = startNextDay(run);
    writeSave(next);
    set({ run: next, hasSave: true });
  },

  clearProgress: () => {
    clearSave();
    set({
      run: null,
      hasSave: false,
      screen: "TITLE",
      seedInput: DEFAULT_SEED,
    });
  },

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
