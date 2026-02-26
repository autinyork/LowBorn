type LogPanelProps = {
  entries: string[];
  compact: boolean;
};

export function LogPanel({ entries, compact }: LogPanelProps) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <h3 className="text-lg font-semibold text-slate-100">Log</h3>
      <div
        className={`mt-3 overflow-auto rounded border border-slate-800 bg-slate-900/70 p-3 ${
          compact ? "max-h-36 space-y-1 text-xs" : "max-h-48 space-y-2 text-sm"
        }`}
      >
        {[...entries].reverse().map((entry, index) => (
          <p key={`${index}-${entry}`} className="text-slate-300">
            {entry}
          </p>
        ))}
      </div>
    </section>
  );
}
