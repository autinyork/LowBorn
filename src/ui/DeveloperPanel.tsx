import type { GameState } from "../game/types";

type DeveloperPanelProps = {
  run: GameState;
};

function boolLabel(value: boolean): string {
  return value ? "yes" : "no";
}

export function DeveloperPanel({ run }: DeveloperPanelProps) {
  const adoptionRows = run.npcProfiles.map((npc) => ({
    npc,
    adoption: run.hidden.rumorAdoption[npc.id] ?? {
      adopted: false,
      heardCount: 0,
      spreadCount: 0,
      lastHeardDay: null,
    },
  }));

  return (
    <details className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <summary
        id="developer-panel-toggle"
        className="cursor-pointer text-sm font-semibold text-slate-200"
      >
        Developer Panel (Debug)
      </summary>

      <div className="mt-3 grid gap-4 lg:grid-cols-3">
        <section className="rounded border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
          <p className="font-semibold text-slate-100">Hidden Seeds / Flags</p>
          <p className="mt-2">ThreatSeed: {run.hidden.threatSeed}</p>
          <p>Investigation focus: {run.hidden.investigationFocus}</p>
          <p>Intense streak: {run.hidden.intenseStreak}</p>
          <p>Pending accusation conflict: {boolLabel(run.hidden.pendingAccusationConflict)}</p>
          <p className="mt-2 text-slate-400">
            Console: <span className="font-mono">window.run_simulation_report(\"seed\", 100)</span>
          </p>
        </section>

        <section className="rounded border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300 lg:col-span-2">
          <p className="font-semibold text-slate-100">Per-NPC Rumor Adoption</p>
          <div className="mt-2 max-h-40 overflow-auto space-y-1">
            {adoptionRows.map(({ npc, adoption }) => (
              <p key={npc.id}>
                {npc.name} ({npc.role}) {"->"} adopted: {boolLabel(adoption.adopted)}, heard:{" "}
                {adoption.heardCount}, spread: {adoption.spreadCount}, last day:{" "}
                {adoption.lastHeardDay ?? "-"}
              </p>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-4 rounded border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
        <p className="font-semibold text-slate-100">Last Debrief (truth vs claim)</p>
        {!run.hidden.lastDebrief ? (
          <p className="mt-2">No camp debrief resolved yet.</p>
        ) : (
          <div className="mt-2 space-y-2">
            <p>
              Day {run.hidden.lastDebrief.day} | choice: {run.hidden.lastDebrief.choiceId ?? "none"} |
              rumor reach: {run.hidden.lastDebrief.rumorReachCount}
            </p>
            {run.hidden.lastDebrief.reports.map((report, index) => (
              <p key={`${report.npcId}-${index}`}>
                {report.npcName}: claim="{report.claimedObservations[0] ?? "unknown"}" | truth="
                {report.truthObservation}" | lying={boolLabel(report.isLying)}
              </p>
            ))}
          </div>
        )}
      </section>
    </details>
  );
}
