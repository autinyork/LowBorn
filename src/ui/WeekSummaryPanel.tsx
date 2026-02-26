import { useMemo, useState } from "react";
import type { WeekSummary } from "../game/types";

type WeekSummaryPanelProps = {
  summary: WeekSummary;
};

function indicatorClass(active: boolean): string {
  return active
    ? "border-rose-500/40 bg-rose-950/30 text-rose-200"
    : "border-emerald-500/40 bg-emerald-950/20 text-emerald-200";
}

export function WeekSummaryPanel({ summary }: WeekSummaryPanelProps) {
  const [copyState, setCopyState] = useState<"idle" | "ok" | "error">("idle");

  const collapseRows = useMemo(
    () => [
      { label: "Morale low", active: summary.collapseIndicators.moraleLow },
      { label: "Discipline low", active: summary.collapseIndicators.disciplineLow },
      { label: "Rumor high", active: summary.collapseIndicators.rumorHigh },
    ],
    [summary.collapseIndicators]
  );

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(summary.shareText);
      setCopyState("ok");
    } catch {
      setCopyState("error");
    }
  };

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <h3 className="text-lg font-semibold text-slate-100">Week Summary</h3>
      <p className="mt-2 text-sm text-slate-300">Week {summary.week} complete.</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm">
          <p className="text-slate-400">Nights survived</p>
          <p className="font-semibold text-slate-100">{summary.nightsSurvived} / 7</p>
        </div>
        <div className="rounded border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm">
          <p className="text-slate-400">What broke first?</p>
          <p className="font-semibold text-slate-100">{summary.firstBreakLabel}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {collapseRows.map((row) => (
          <div key={row.label} className={`rounded border px-3 py-2 text-sm ${indicatorClass(row.active)}`}>
            {row.label}: {row.active ? "triggered" : "stable"}
          </div>
        ))}
      </div>

      <div className="mt-4 rounded border border-slate-700 bg-slate-900/70 p-3 text-sm">
        <p className="font-semibold text-slate-100">Shareable Summary</p>
        <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap text-xs text-slate-300">
          {summary.shareText}
        </pre>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          id="copy-week-summary-button"
          onClick={copyShareText}
          className="rounded bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          Copy Summary
        </button>
        {copyState === "ok" && <p className="text-xs text-emerald-300">Copied to clipboard.</p>}
        {copyState === "error" && (
          <p className="text-xs text-rose-300">Clipboard blocked in this context. Copy manually.</p>
        )}
      </div>
    </section>
  );
}
