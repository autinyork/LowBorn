/// <reference types="vite/client" />

interface Window {
  render_game_to_text?: () => string;
  advanceTime?: (ms: number) => Promise<void>;
  run_simulation_report?: (baseSeed?: string, runs?: number) => unknown;
}
