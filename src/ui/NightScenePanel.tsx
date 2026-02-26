import { useEffect, useMemo, useState } from "react";
import type { NightScene } from "../game/types";

type NightScenePanelProps = {
  scene: NightScene;
  onResolveNight: (choiceId?: string) => void;
};

function summarizeChoiceConsequence(scene: NightScene, choiceId: string): string {
  const choice = scene.choices.find((entry) => entry.id === choiceId);
  if (!choice) {
    return "No consequence data available.";
  }

  const parts: string[] = [];
  const player = choice.playerDelta;
  const camp = choice.campDelta;

  const impacts: Array<[string, number | undefined]> = [
    ["warmth", player.warmth],
    ["stamina", player.stamina],
    ["injury", player.injury],
    ["hunger", player.hunger],
    ["sanity", player.sanity],
    ["supplies", camp.supplies],
    ["morale", camp.morale],
    ["discipline", camp.discipline],
    ["rumor", camp.rumor],
  ];

  for (const [label, value] of impacts) {
    if (value === undefined || value === 0) {
      continue;
    }
    parts.push(`${label} ${value > 0 ? `+${value}` : value}`);
  }

  return parts.length > 0 ? `Predicted choice impact: ${parts.join(", ")}.` : "No direct stat swing from this choice.";
}

export function NightScenePanel({ scene, onResolveNight }: NightScenePanelProps) {
  const defaultChoiceId = useMemo(() => scene.choices[0]?.id ?? "", [scene.choices]);
  const [selectedChoiceId, setSelectedChoiceId] = useState(defaultChoiceId);

  useEffect(() => {
    setSelectedChoiceId(defaultChoiceId);
  }, [defaultChoiceId, scene.day, scene.eventCard.id]);

  const selectedChoice = scene.choices.find((entry) => entry.id === selectedChoiceId) ?? scene.choices[0];

  if (scene.sceneType === "CAMP") {
    return (
      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h3 className="text-lg font-semibold text-slate-100">Camp Scene</h3>
        <p className="mt-2 text-sm text-slate-300">{scene.eventCard.title}</p>
        <p className="mt-2 text-sm text-slate-200">{scene.presentedOutcome}</p>
        {scene.falsePerceptionOverlay && (
          <div className="mt-2 rounded border border-violet-400/40 bg-violet-950/30 p-3 text-xs text-violet-200">
            Perception drift: {scene.falsePerceptionOverlay}
          </div>
        )}
        <div className="mt-4 rounded border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">
          <p className="font-semibold text-slate-200">Wait for patrol return</p>
          <p className="mt-1">Patrol returns with debriefs. Choose how to respond.</p>
        </div>

        {scene.debriefReports.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Returning Debriefs
            </p>
            {scene.debriefReports.map((report) => (
              <div
                key={`${report.npcId}-${report.truthObservation}-${report.claimedObservations[0]}`}
                className="rounded border border-slate-700 bg-slate-900/70 p-3 text-sm"
              >
                <p className="font-semibold text-slate-200">{report.npcName}</p>
                <p className="mt-1 text-slate-300">Claim: {report.presentedClaim}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Confidence {Math.round(report.confidence * 100)}% | {report.emotion}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-2">
          {scene.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => setSelectedChoiceId(choice.id)}
              className={`block w-full rounded border px-3 py-2 text-left text-sm ${
                selectedChoiceId === choice.id
                  ? "border-amber-500 bg-amber-900/20 text-amber-100"
                  : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500"
              }`}
              title={summarizeChoiceConsequence(scene, choice.id)}
            >
              <p className="font-semibold">{choice.label}</p>
              <p className="mt-1 text-xs">{choice.description}</p>
            </button>
          ))}
        </div>

        <button
          type="button"
          id="wait-return-button"
          autoFocus
          onClick={() => onResolveNight(selectedChoice?.id)}
          className="mt-4 rounded bg-amber-600 px-3 py-2 font-semibold text-white hover:bg-amber-500"
        >
          Resolve Debrief
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <h3 className="text-lg font-semibold text-slate-100">Patrol Scene</h3>
      {scene.presentedRouteDescription && (
        <p className="mt-2 rounded border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">
          Route: {scene.presentedRouteDescription}
        </p>
      )}
      {scene.falsePerceptionOverlay && (
        <div className="mt-2 rounded border border-violet-400/40 bg-violet-950/30 p-3 text-xs text-violet-200">
          Perception drift: {scene.falsePerceptionOverlay}
        </div>
      )}
      <p className="mt-3 text-sm font-semibold text-slate-100">{scene.eventCard.title}</p>
      <p className="mt-1 text-sm text-slate-200">{scene.presentedOutcome}</p>

      <div className="mt-4 space-y-2">
        {scene.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => setSelectedChoiceId(choice.id)}
            className={`block w-full rounded border px-3 py-2 text-left text-sm ${
              selectedChoiceId === choice.id
                ? "border-amber-500 bg-amber-900/20 text-amber-100"
                : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500"
            }`}
            title={summarizeChoiceConsequence(scene, choice.id)}
          >
            <p className="font-semibold">{choice.label}</p>
            <p className="mt-1 text-xs">{choice.description}</p>
          </button>
        ))}
      </div>

      <button
        type="button"
        id="resolve-night-button"
        autoFocus
        onClick={() => onResolveNight(selectedChoice?.id)}
        className="mt-4 rounded bg-amber-600 px-3 py-2 font-semibold text-white hover:bg-amber-500"
      >
        Resolve Night
      </button>
    </section>
  );
}
