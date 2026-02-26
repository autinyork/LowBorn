type TitleScreenProps = {
  canContinue: boolean;
  onNewRun: () => void;
  onContinue: () => void;
  onSettings: () => void;
  onRunJournal: () => void;
};

export function TitleScreen({
  canContinue,
  onNewRun,
  onContinue,
  onSettings,
  onRunJournal,
}: TitleScreenProps) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-950/70 p-8 shadow-frost">
        <h1 className="text-4xl font-bold tracking-tight text-slate-100">Lowborn</h1>
        <p className="mt-3 text-sm text-slate-300">
          Frontier watch command sim. Survive one hard week of patrols, camp duty, and rumor spillover.
        </p>
        <div className="mt-8 space-y-3">
          <button
            type="button"
            id="new-run-button"
            onClick={onNewRun}
            className="w-full rounded bg-amber-600 px-4 py-3 text-left font-semibold text-white hover:bg-amber-500"
          >
            New Run
          </button>
          <button
            type="button"
            id="continue-button"
            onClick={onContinue}
            disabled={!canContinue}
            className="w-full rounded border border-slate-600 px-4 py-3 text-left font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </button>
          <button
            type="button"
            id="open-journal-button"
            onClick={onRunJournal}
            disabled={!canContinue}
            className="w-full rounded border border-slate-600 px-4 py-3 text-left font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Run Journal
          </button>
          <button
            type="button"
            id="settings-button"
            onClick={onSettings}
            className="w-full rounded border border-slate-600 px-4 py-3 text-left font-semibold text-slate-200 hover:bg-slate-800"
          >
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}
