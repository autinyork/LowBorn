import type { WeekSchedule } from "../game/types";

type ScheduleBoardProps = {
  schedule: WeekSchedule;
  currentDay: number;
};

export function ScheduleBoard({ schedule, currentDay }: ScheduleBoardProps) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <h3 className="text-lg font-semibold text-slate-100">Schedule Board</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {schedule.map((entry) => {
          const isToday = entry.day === currentDay;
          return (
            <li
              key={entry.day}
              className={`rounded border px-3 py-2 ${
                isToday
                  ? "border-sky-500 bg-sky-900/20"
                  : entry.resolved
                    ? "border-slate-700 bg-slate-900/70"
                    : "border-slate-800 bg-slate-950/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-200">{entry.label}</span>
                <span className="text-xs font-semibold text-slate-300">
                  {entry.scheduledDuty} / {entry.scheduledShift}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {entry.resolved ? entry.eventTitle ?? "Resolved" : isToday ? "Today" : "Pending"}
              </p>
              {entry.disruption.type !== "NONE" && (
                <p className="mt-1 text-xs text-amber-300">
                  Disrupted {"->"} {entry.assignedDuty}
                  {entry.disruption.extraDuty ? ` + ${entry.disruption.extraDuty}` : ""}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
