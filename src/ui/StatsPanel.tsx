import type { CampStats, PlayerStats } from "../game/types";

type StatsPanelProps = {
  playerStats: PlayerStats;
  campStats: CampStats;
};

type StatMeta = {
  label: string;
  value: number;
  tooltip: string;
};

function StatRow({ label, value, tooltip }: StatMeta) {
  return (
    <div className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/70 px-3 py-2">
      <span className="flex items-center gap-2 text-sm text-slate-300">
        {label}
        <span
          className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-600 text-[10px] text-slate-300"
          title={tooltip}
          aria-label={`${label} help`}
        >
          ?
        </span>
      </span>
      <span className="text-sm font-semibold text-slate-100">{value}</span>
    </div>
  );
}

export function StatsPanel({ playerStats, campStats }: StatsPanelProps) {
  const rows: StatMeta[] = [
    {
      label: "Supplies",
      value: campStats.supplies,
      tooltip: "Food, fuel, and gear reserves. Low supplies increase strain and event penalties.",
    },
    {
      label: "Morale",
      value: campStats.morale,
      tooltip: "Overall confidence of the watch. Low morale increases collapse risk and conflict intensity.",
    },
    {
      label: "Discipline",
      value: campStats.discipline,
      tooltip: "Order and compliance. Higher discipline dampens rumor spread and chaos events.",
    },
    {
      label: "Rumor",
      value: campStats.rumor,
      tooltip: "Unverified fear in circulation. High rumor drives social instability and misinformation.",
    },
    {
      label: "Warmth",
      value: playerStats.warmth,
      tooltip: "Cold exposure. Low warmth makes patrols harsher and recovery slower.",
    },
    {
      label: "Stamina",
      value: playerStats.stamina,
      tooltip: "Physical capacity. Low stamina limits resilience to hazards and night duties.",
    },
    {
      label: "Sanity",
      value: playerStats.sanity,
      tooltip: "Mental stability. Low sanity distorts presentation and worsens psychological pressure.",
    },
    {
      label: "Injury",
      value: playerStats.injury,
      tooltip: "Accumulated physical harm. High injury raises collapse risk and weakens patrol outcomes.",
    },
  ];

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <h3 className="text-lg font-semibold text-slate-100">Stats</h3>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <StatRow
            key={row.label}
            label={row.label}
            value={row.value}
            tooltip={row.tooltip}
          />
        ))}
      </div>
    </section>
  );
}
