import { toSaveEnvelope } from "../game/migrations";
import { buildRunJournalEntries, buildShareableRunText } from "../game/journal";
import type { GameState } from "../game/types";

type RunJournalScreenProps = {
  run: GameState | null;
  onBackToTitle: () => void;
  onBackToGame: () => void;
};

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function RunJournalScreen({ run, onBackToTitle, onBackToGame }: RunJournalScreenProps) {
  if (!run) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-rose-500/40 bg-rose-950/20 p-6 text-sm text-rose-200">
        <p>No saved run found. Start a run first.</p>
        <button
          type="button"
          className="mt-4 rounded border border-slate-600 px-4 py-2 font-semibold text-slate-200 hover:bg-slate-800"
          onClick={onBackToTitle}
        >
          Back to Title
        </button>
      </div>
    );
  }

  const entries = buildRunJournalEntries(run);
  const shareText = buildShareableRunText(run);

  const exportJson = () => {
    const payload = {
      exportType: "lowborn-run-export",
      exportedAt: new Date().toISOString(),
      save: toSaveEnvelope(run),
      journalEntries: entries,
    };
    const filename = `lowborn-run-${run.seed.replace(/[^a-z0-9-_]/gi, "-")}-week-${run.week}.json`;
    downloadText(filename, JSON.stringify(payload, null, 2), "application/json");
  };

  const exportText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      downloadText("lowborn-run-summary.txt", shareText, "text/plain");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-100">Run Journal</h2>
            <p className="mt-1 text-sm text-slate-300">
              Seed <span className="font-mono">{run.seed}</span> | Week {run.week} | Nights resolved{" "}
              {run.nightLogs.length}/7
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              id="download-run-json-button"
              onClick={exportJson}
              className="rounded border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
            >
              Download JSON
            </button>
            <button
              type="button"
              id="copy-run-text-button"
              onClick={exportText}
              className="rounded bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500"
            >
              Copy Share Text
            </button>
            <button
              type="button"
              onClick={onBackToGame}
              className="rounded border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
            >
              Back to Game
            </button>
            <button
              type="button"
              onClick={onBackToTitle}
              className="rounded border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
            >
              Back to Title
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h3 className="text-lg font-semibold text-slate-100">Day-by-Day Journal</h3>
        <div className="mt-3 grid gap-2">
          {entries.map((entry) => (
            <article
              key={entry.day}
              className="rounded border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-200"
            >
              <p className="font-semibold text-slate-100">
                Day {entry.day} - {entry.label}
              </p>
              <p className="mt-1 text-slate-300">Assignment: {entry.assignment}</p>
              <p className="mt-1 text-slate-300">Disruption: {entry.disruption}</p>
              <p className="mt-1 text-slate-300">Night summary: {entry.nightSummary}</p>
              <p className="mt-1 text-slate-300">Dawn deltas: {entry.dawnDeltaSummary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h3 className="text-lg font-semibold text-slate-100">Shareable Text Preview</h3>
        <pre className="mt-3 max-h-72 overflow-auto rounded border border-slate-700 bg-slate-900/70 p-3 text-xs text-slate-200">
          {shareText}
        </pre>
      </section>
    </div>
  );
}
