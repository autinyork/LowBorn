/**
 * Keyboard shortcuts and control information for Lowborn
 */

export const KEYBOARD_SHORTCUTS = {
  TOGGLE_JOURNAL: {
    key: "B",
    description: "Toggle between Game and Run Journal view",
    context: "While playing or in journal",
  },
  BEGIN_NIGHT: {
    key: "Enter",
    description: "Trigger the current action button",
    context: "During day/decision screens",
  },
} as const;

export function KeyboardShortcutsInfo() {
  return (
    <div className="rounded border border-slate-700 bg-slate-900/50 p-3 text-xs text-slate-300">
      <p className="font-semibold text-slate-200 mb-2">⌨️ Keyboard Shortcuts</p>
      <div className="space-y-1">
        {Object.entries(KEYBOARD_SHORTCUTS).map(([_key, shortcut]) => (
          <div key={_key} className="flex justify-between">
            <span className="font-mono text-amber-300">{shortcut.key}</span>
            <span className="text-slate-400">{shortcut.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
