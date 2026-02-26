type SettingsScreenProps = {
  compactLog: boolean;
  fontScale: "normal" | "large";
  reduceMotion: boolean;
  highContrast: boolean;
  onToggleCompactLog: () => void;
  onToggleFontScale: () => void;
  onToggleReduceMotion: () => void;
  onToggleHighContrast: () => void;
  onBack: () => void;
  onClearSave: () => void;
};

export function SettingsScreen({
  compactLog,
  fontScale,
  reduceMotion,
  highContrast,
  onToggleCompactLog,
  onToggleFontScale,
  onToggleReduceMotion,
  onToggleHighContrast,
  onBack,
  onClearSave,
}: SettingsScreenProps) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-700 bg-slate-950/70 p-6 shadow-frost">
      <h2 className="text-2xl font-semibold text-slate-100">Settings</h2>
      <p className="mt-2 text-sm text-slate-300">Minimal prototype settings for this vertical slice.</p>

      <div className="mt-5 rounded border border-slate-700 bg-slate-900/70 p-4">
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3 text-slate-200">
            <input type="checkbox" checked={compactLog} onChange={onToggleCompactLog} />
            Compact log rows
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-slate-200">
            <input
              type="checkbox"
              checked={fontScale === "large"}
              onChange={onToggleFontScale}
            />
            Large font mode
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-slate-200">
            <input type="checkbox" checked={reduceMotion} onChange={onToggleReduceMotion} />
            Reduce motion
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-slate-200">
            <input type="checkbox" checked={highContrast} onChange={onToggleHighContrast} />
            High contrast mode
          </label>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded border border-slate-600 px-4 py-2 font-semibold text-slate-200 hover:bg-slate-800"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onClearSave}
          className="rounded bg-rose-700 px-4 py-2 font-semibold text-white hover:bg-rose-600"
        >
          Clear Saved Run
        </button>
      </div>
    </div>
  );
}
