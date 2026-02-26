import { useEffect } from "react";
import { runSimulationReport } from "../game/simulation";
import { useGameStore } from "../state/useGameStore";
import { MainGameScreen } from "../ui/MainGameScreen";
import { NewRunScreen } from "../ui/NewRunScreen";
import { RunJournalScreen } from "../ui/RunJournalScreen";
import { SettingsScreen } from "../ui/SettingsScreen";
import { TitleScreen } from "../ui/TitleScreen";

export function App() {
  const screen = useGameStore((state) => state.screen);
  const run = useGameStore((state) => state.run);
  const hasSave = useGameStore((state) => state.hasSave);
  const seedInput = useGameStore((state) => state.seedInput);
  const settings = useGameStore((state) => state.settings);
  const openTitle = useGameStore((state) => state.openTitle);
  const openNewRun = useGameStore((state) => state.openNewRun);
  const openGame = useGameStore((state) => state.openGame);
  const openSettings = useGameStore((state) => state.openSettings);
  const openRunJournal = useGameStore((state) => state.openRunJournal);
  const continueRun = useGameStore((state) => state.continueRun);
  const startNewRun = useGameStore((state) => state.startNewRun);
  const setSeedInput = useGameStore((state) => state.setSeedInput);
  const beginNight = useGameStore((state) => state.beginNight);
  const resolveNight = useGameStore((state) => state.resolveNight);
  const startNextDay = useGameStore((state) => state.startNextDay);
  const clearProgress = useGameStore((state) => state.clearProgress);
  const toggleCompactLog = useGameStore((state) => state.toggleCompactLog);
  const toggleFontScale = useGameStore((state) => state.toggleFontScale);
  const toggleReduceMotion = useGameStore((state) => state.toggleReduceMotion);
  const toggleHighContrast = useGameStore((state) => state.toggleHighContrast);

  useEffect(() => {
    window.render_game_to_text = () =>
      JSON.stringify({
        screen,
        phase: run?.phase ?? null,
        week: run?.week ?? null,
        day: run ? run.todayIndex + 1 : null,
        complete: run?.complete ?? false,
        assignment: run?.schedule[run.todayIndex]?.assignedDuty ?? null,
        disruption: run?.schedule[run.todayIndex]?.disruption.type ?? null,
        scene: run?.activeNightScene
          ? {
              sceneType: run.activeNightScene.sceneType,
              event: run.activeNightScene.eventCard.title,
              choices: run.activeNightScene.choices.map((entry) => entry.label),
              debriefCount: run.activeNightScene.debriefReports.length,
              investigationActive: run.activeNightScene.investigationActive,
              distortionLevel: run.activeNightScene.distortionLevel,
              falsePerceptionOverlay: run.activeNightScene.falsePerceptionOverlay,
            }
          : null,
        dawnReport: run?.dawnReport
          ? {
              day: run.dawnReport.day,
              deltas: run.dawnReport.deltas,
              rumorReachCount: run.dawnReport.rumorReachCount,
            }
          : null,
        weekSummary: run?.weekSummary
          ? {
              nightsSurvived: run.weekSummary.nightsSurvived,
              firstBreakLabel: run.weekSummary.firstBreakLabel,
              collapseIndicators: run.weekSummary.collapseIndicators,
            }
          : null,
        stats: run
          ? {
              camp: run.campStats,
              player: run.playerStats,
            }
          : null,
        hidden: run
          ? {
              threatSeed: run.hidden.threatSeed,
              investigationFocus: run.hidden.investigationFocus,
              intenseStreak: run.hidden.intenseStreak,
              pendingAccusationConflict: run.hidden.pendingAccusationConflict,
              lastDebriefDay: run.hidden.lastDebrief?.day ?? null,
            }
          : null,
        accessibility: settings,
      });

    window.advanceTime = (ms) =>
      new Promise<void>((resolve) => {
        window.setTimeout(() => resolve(), Math.max(0, ms));
      });

    window.run_simulation_report = (baseSeed, runs) =>
      runSimulationReport(baseSeed, runs);
  }, [run, screen, settings]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "b") {
        return;
      }
      if (screen === "GAME") {
        event.preventDefault();
        openRunJournal();
      } else if (screen === "RUN_JOURNAL") {
        event.preventDefault();
        openGame();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openGame, openRunJournal, screen]);

  const appClasses = [
    "min-h-screen px-4 py-6 text-slate-100 md:px-8",
    settings.fontScale === "large" ? "a11y-font-large" : "",
    settings.highContrast ? "a11y-high-contrast" : "",
    settings.reduceMotion ? "a11y-reduce-motion" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={appClasses}>
      <div className="mx-auto max-w-7xl">
        {screen === "TITLE" && (
          <TitleScreen
            canContinue={hasSave}
            onNewRun={openNewRun}
            onContinue={continueRun}
            onRunJournal={openRunJournal}
            onSettings={openSettings}
          />
        )}

        {screen === "NEW_RUN" && (
          <NewRunScreen
            seedInput={seedInput}
            onSeedChange={setSeedInput}
            onBack={openTitle}
            onStart={startNewRun}
          />
        )}

        {screen === "SETTINGS" && (
          <SettingsScreen
            compactLog={settings.compactLog}
            fontScale={settings.fontScale}
            reduceMotion={settings.reduceMotion}
            highContrast={settings.highContrast}
            onToggleCompactLog={toggleCompactLog}
            onToggleFontScale={toggleFontScale}
            onToggleReduceMotion={toggleReduceMotion}
            onToggleHighContrast={toggleHighContrast}
            onBack={openTitle}
            onClearSave={clearProgress}
          />
        )}

        {screen === "GAME" && run && (
          <MainGameScreen
            run={run}
            compactLog={settings.compactLog}
            onBeginNight={beginNight}
            onResolveNight={resolveNight}
            onStartNextDay={startNextDay}
            onOpenJournal={openRunJournal}
            onBackToTitle={openTitle}
          />
        )}

        {screen === "RUN_JOURNAL" && (
          <RunJournalScreen run={run} onBackToTitle={openTitle} onBackToGame={openGame} />
        )}

        {screen === "GAME" && !run && (
          <div className="mx-auto mt-16 max-w-lg rounded-xl border border-rose-500/40 bg-rose-950/20 p-5 text-sm text-rose-200">
            Run state missing. Start a New Run from title.
          </div>
        )}
      </div>
    </div>
  );
}
