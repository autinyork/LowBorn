import { useState } from "react";
import { downloadSave, importSaveFile } from "../utils/saveExport";

type SettingsScreenProps = {
  compactLog: boolean;
  fontScale: "normal" | "large";
  reduceMotion: boolean;
  highContrast: boolean;
  onToggleCompactLog: () => void;
  onToggleFontScale: () => void;
  onToggleReduceMotion: () => void;
  onToggleHighContrast: () => void;
  onBack: () => void;
  onClearSave: () => void;
  onExportSave?: () => string | null;
  onImportSave?: (json: string) => boolean;
  seed?: string;
};

export function SettingsScreen({
  compactLog,
  fontScale,
  reduceMotion,
  highContrast,
  onToggleCompactLog,
  onToggleFontScale,
  onToggleReduceMotion,
  onToggleHighContrast,
  onBack,
  onClearSave,
  onExportSave,
  onImportSave,
  seed = "lowborn-save",
}: SettingsScreenProps) {
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [showImportMessage, setShowImportMessage] = useState(false);

  const handleExport = () => {
    if (!onExportSave) return;
    const json = onExportSave();
    if (json) {
      downloadSave(json, seed);
    }
  };

  const handleImport = async () => {
    if (!onImportSave) return;
    const fileContent = await importSaveFile();
    if (!fileContent) {
      setImportMessage("No file selected");
      setShowImportMessage(true);
      setTimeout(() => setShowImportMessage(false), 3000);
      return;
    }

    const success = onImportSave(fileContent);
    if (success) {
      setImportMessage("Save imported successfully!");
      setShowImportMessage(true);
      setTimeout(() => setShowImportMessage(false), 3000);
    } else {
      setImportMessage("Failed to import save file");
      setShowImportMessage(true);
      setTimeout(() => setShowImportMessage(false), 3000);
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-700 bg-slate-950/70 p-6 shadow-frost">
      <h2 className="text-2xl font-semibold text-slate-100">Settings</h2>
      <p className="mt-2 text-sm text-slate-300">Customize your experience and manage saves.</p>

      <div className="mt-5 rounded border border-slate-700 bg-slate-900/70 p-4">
        <h3 className="font-semibold text-slate-200 mb-3">Accessibility</h3>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3 text-slate-200">
            <input type="checkbox" checked={compactLog} onChange={onToggleCompactLog} />
            Compact log rows
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-slate-200">
            <input
              type="checkbox"
              checked={fontScale === "large"}
              onChange={onToggleFontScale}
            />
            Large font mode
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-slate-200">
            <input type="checkbox" checked={reduceMotion} onChange={onToggleReduceMotion} />
            Reduce motion
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-slate-200">
            <input type="checkbox" checked={highContrast} onChange={onToggleHighContrast} />
            High contrast mode
          </label>
        </div>
      </div>

      <div className="mt-5 rounded border border-slate-700 bg-slate-900/70 p-4">
        <h3 className="font-semibold text-slate-200 mb-3">Save Management</h3>
        <div className="space-y-2">
          {onExportSave && (
            <button
              type="button"
              onClick={handleExport}
              className="block w-full rounded border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 text-left"
            >
              📥 Download Save
            </button>
          )}
          {onImportSave && (
            <button
              type="button"
              onClick={handleImport}
              className="block w-full rounded border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 text-left"
            >
              📤 Import Save from File
            </button>
          )}
          <button
            type="button"
            onClick={onClearSave}
            className="block w-full rounded bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-600 text-left"
          >
            🗑️ Delete Saved Run
          </button>
        </div>
        {showImportMessage && (
          <p className={`mt-2 text-xs ${importMessage?.includes("successfully") ? "text-green-300" : "text-rose-300"}`}>
            {importMessage}
          </p>
        )}
      </div>

      <div className="mt-6 flex gap-3">
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
