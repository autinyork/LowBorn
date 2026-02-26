type NewRunScreenProps = {
  seedInput: string;
  onSeedChange: (value: string) => void;
  onBack: () => void;
  onStart: () => void;
};

export function NewRunScreen({ seedInput, onSeedChange, onBack, onStart }: NewRunScreenProps) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-700 bg-slate-950/70 p-6 shadow-frost">
      <h2 className="text-2xl font-semibold text-slate-100">New Run</h2>
      <p className="mt-2 text-sm text-slate-300">
        Seed is optional. Use the same seed to reproduce the same week schedule and events.
      </p>
      <label className="mt-5 block text-sm font-medium text-slate-200" htmlFor="seed-input">
        Seed
      </label>
      <input
        id="seed-input"
        value={seedInput}
        onChange={(event) => onSeedChange(event.target.value)}
        placeholder="lowborn-week-seed"
        className="mt-2 w-full rounded border border-slate-600 bg-slate-900/80 px-3 py-2 text-slate-100"
      />
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          id="start-week-button"
          autoFocus
          onClick={onStart}
          className="rounded bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500"
        >
          Start Week 1, Day 1
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded border border-slate-600 px-4 py-2 font-semibold text-slate-200 hover:bg-slate-800"
        >
          Back
        </button>
      </div>
    </div>
  );
}
