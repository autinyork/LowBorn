type NewRunScreenProps = {
  seedInput: string;
  onSeedChange: (value: string) => void;
  onBack: () => void;
  onStart: () => void;
};

function sanitizeSeed(input: string): string {
  // Trim whitespace and limit length to prevent storage issues
  return input.trim().slice(0, 256);
}

export function NewRunScreen({ seedInput, onSeedChange, onBack, onStart }: NewRunScreenProps) {
  const sanitized = sanitizeSeed(seedInput);
  const isValidSeed = sanitized.length === 0 || /^[a-zA-Z0-9\-_.:\s]+$/.test(sanitized);
  const errorMessage = !isValidSeed ? "Seed can only contain letters, numbers, dashes, underscores, colons, and spaces" : "";

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
        maxLength={256}
        className={`mt-2 w-full rounded border px-3 py-2 text-slate-100 bg-slate-900/80 ${
          errorMessage ? "border-rose-500/60" : "border-slate-600"
        }`}
      />
      {errorMessage && <p className="mt-2 text-xs text-rose-300">{errorMessage}</p>}
      <p className="mt-2 text-xs text-slate-400">Length: {sanitized.length}/256</p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          id="start-week-button"
          autoFocus
          onClick={onStart}
          disabled={!isValidSeed}
          className={`rounded px-4 py-2 font-semibold text-white ${
            isValidSeed ? "bg-sky-600 hover:bg-sky-500" : "bg-slate-600 cursor-not-allowed opacity-60"
          }`}
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
