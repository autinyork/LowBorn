import { DeveloperPanel } from "./DeveloperPanel";
import { DawnReportPanel } from "./DawnReportPanel";
import type { GameState } from "../game/types";
import { LogPanel } from "./LogPanel";
import { NightScenePanel } from "./NightScenePanel";
import { ScheduleBoard } from "./ScheduleBoard";
import { StatsPanel } from "./StatsPanel";
import { TodayPanel } from "./TodayPanel";
import { WeekSummaryPanel } from "./WeekSummaryPanel";

type MainGameScreenProps = {
  run: GameState;
  compactLog: boolean;
  onBeginNight: () => void;
  onResolveNight: (choiceId?: string) => void;
  onStartNextDay: () => void;
  onOpenJournal: () => void;
  onBackToTitle: () => void;
};

export function MainGameScreen({
  run,
  compactLog,
  onBeginNight,
  onResolveNight,
  onStartNextDay,
  onOpenJournal,
  onBackToTitle,
}: MainGameScreenProps) {
  const today = run.schedule[run.todayIndex] ?? run.schedule[run.schedule.length - 1] ?? null;

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-100">Week {run.week}</h2>
            <p className="text-sm text-slate-300">
              Seed: <span className="font-mono">{run.seed}</span> | Day {run.todayIndex + 1} |{" "}
              {run.phase}
            </p>
          </div>
          <button
            type="button"
            id="journal-button"
            onClick={onOpenJournal}
            className="rounded border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Run Journal
          </button>
          <button
            type="button"
            onClick={onBackToTitle}
            className="rounded border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Back to Title
          </button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <ScheduleBoard schedule={run.schedule} currentDay={run.todayIndex + 1} />
        </div>
        <div className="lg:col-span-6">
          {run.phase === "DAY" && (
            <TodayPanel
              today={today}
              summary={run.todaySummary}
              complete={run.complete}
              phase={run.phase}
              onBeginNight={onBeginNight}
            />
          )}
          {run.phase === "NIGHT_SCENE" && run.activeNightScene && (
            <NightScenePanel scene={run.activeNightScene} onResolveNight={onResolveNight} />
          )}
          {run.phase === "NIGHT_SCENE" && !run.activeNightScene && (
            <section className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-sm text-rose-200">
              Night scene data is missing. Return to title and continue run.
            </section>
          )}
          {run.phase === "DAWN_REPORT" && run.dawnReport && (
            <DawnReportPanel report={run.dawnReport} onStartNextDay={onStartNextDay} />
          )}
          {run.phase === "DAWN_REPORT" && !run.dawnReport && (
            <section className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-sm text-rose-200">
              Dawn report data is missing. Return to title and continue run.
            </section>
          )}
          {run.phase === "WEEK_SUMMARY" && run.weekSummary && (
            <WeekSummaryPanel summary={run.weekSummary} />
          )}
          {run.phase === "WEEK_SUMMARY" && !run.weekSummary && (
            <section className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-sm text-rose-200">
              Week summary data is missing. Return to title and continue run.
            </section>
          )}
        </div>
        <div className="lg:col-span-3">
          <StatsPanel playerStats={run.playerStats} campStats={run.campStats} />
        </div>
      </div>

      <DeveloperPanel run={run} />

      <LogPanel entries={run.recentEvents} compact={compactLog} />
    </div>
  );
}
