import type { DayAssignment } from "../game/types";

type TodayPanelProps = {
  today: DayAssignment | null;
  summary: string;
  complete: boolean;
  phase: "DAY" | "NIGHT_SCENE" | "DAWN_REPORT" | "WEEK_SUMMARY";
  onBeginNight: () => void;
};

export function TodayPanel({
  today,
  summary,
  complete,
  phase,
  onBeginNight,
}: TodayPanelProps) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <h3 className="text-lg font-semibold text-slate-100">Today</h3>
      {complete ? (
        <p className="mt-3 text-sm text-emerald-300">Week finished. Start a new run from title.</p>
      ) : today ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-slate-200">
            <span className="font-semibold">{today.label}</span> assigned duty:{" "}
            <span className="font-semibold text-sky-300">
              {today.assignedDuty} ({today.assignedShift})
            </span>
          </p>
          {today.disruption.type !== "NONE" && (
            <div className="rounded border border-amber-500/50 bg-amber-950/30 p-3 text-sm text-amber-200">
              <p className="font-semibold">Daily Disruption</p>
              <p className="mt-1">{today.disruption.reason}</p>
              {today.disruption.extraDuty && (
                <p className="mt-1">Extra duty added: {today.disruption.extraDuty}</p>
              )}
            </div>
          )}
          <p className="text-sm text-slate-300">{today.summary ?? summary}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              id="begin-night-button"
              autoFocus
              onClick={onBeginNight}
              disabled={phase !== "DAY"}
              className="rounded bg-amber-600 px-3 py-2 font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Begin Night
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-400">No active day.</p>
      )}
    </section>
  );
}
