import type { DawnReport } from "../game/types";

type DawnReportPanelProps = {
  report: DawnReport;
  onStartNextDay: () => void;
};

function formatDelta(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }
  return `${value}`;
}

function DeltaRow({ label, value }: { label: string; value: number }) {
  const positive = value > 0;
  const negative = value < 0;
  return (
    <div className="flex items-center justify-between rounded border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm">
      <span className="text-slate-300">{label}</span>
      <span
        className={`font-semibold ${
          positive ? "text-emerald-300" : negative ? "text-rose-300" : "text-slate-200"
        }`}
      >
        {formatDelta(value)}
      </span>
    </div>
  );
}

export function DawnReportPanel({ report, onStartNextDay }: DawnReportPanelProps) {
  const finalDay = report.day >= 7;

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <h3 className="text-lg font-semibold text-slate-100">{report.title}</h3>
      <p className="mt-2 text-sm text-slate-300">What changed since yesterday?</p>
      <p className="mt-2 text-sm text-slate-200">{report.summary}</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <DeltaRow label="Supplies" value={report.deltas.supplies} />
        <DeltaRow label="Morale" value={report.deltas.morale} />
        <DeltaRow label="Discipline" value={report.deltas.discipline} />
        <DeltaRow label="Rumor" value={report.deltas.rumor} />
        <DeltaRow label="Rumor Reach" value={report.rumorReachCount} />
        <DeltaRow label="Warmth" value={report.deltas.warmth} />
        <DeltaRow label="Stamina" value={report.deltas.stamina} />
        <DeltaRow label="Sanity" value={report.deltas.sanity} />
        <DeltaRow label="Injuries" value={report.deltas.injury} />
      </div>

      <button
        type="button"
        id="start-next-day-button"
        autoFocus
        onClick={onStartNextDay}
        className="mt-4 rounded bg-sky-600 px-3 py-2 font-semibold text-white hover:bg-sky-500"
      >
        {finalDay ? "View Week Summary" : "Start Next Day"}
      </button>
    </section>
  );
}
