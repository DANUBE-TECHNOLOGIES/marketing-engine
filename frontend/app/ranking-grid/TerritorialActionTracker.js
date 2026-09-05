"use client";

import { useMemo, useState } from "react";

const STATUS_LABELS = {
  todo: "À faire",
  in_progress: "En cours",
  done: "Terminé",
};

function trackedKey(campaignId, city, code) {
  return `${Number(campaignId)}:${city}:${code}`;
}

function actionKey(row) {
  const metadata = row?.metadata || {};
  return trackedKey(metadata.sourceCampaignId, metadata.territoryCity, metadata.actionCode);
}

function statusClasses(status) {
  if (status === "done") return "bg-emerald-100 text-emerald-900";
  if (status === "in_progress") return "bg-cyan-100 text-cyan-900";
  return "bg-slate-100 text-slate-700";
}

function impactLabel(impact) {
  if (!impact) return "En attente du prochain relevé 14z comparable";
  const gain = Number(impact.averageRankGain);
  if (!Number.isFinite(gain)) return "Mesure non comparable";
  if (gain > 0) return `+${gain} place(s) gagnée(s) en moyenne`;
  if (gain < 0) return `${Math.abs(gain)} place(s) perdue(s) en moyenne`;
  return "Position moyenne stable";
}

export default function TerritorialActionTracker({
  campaignId,
  agencyId,
  keywordId,
  initialActions = [],
  plan = null,
}) {
  const [actions, setActions] = useState(Array.isArray(initialActions) ? initialActions : []);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [drafts, setDrafts] = useState({});

  const tracked = useMemo(() => new Set(actions.map(actionKey)), [actions]);

  async function refresh() {
    const response = await fetch(
      `/api/ranking-grid/territorial-actions?agencyId=${encodeURIComponent(agencyId)}&keywordId=${encodeURIComponent(keywordId)}`,
      { cache: "no-store" },
    );
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
    setActions(payload.actions || []);
  }

  async function create(territory, recommendation) {
    const key = trackedKey(campaignId, territory.city, recommendation.code);
    setBusy(`create:${key}`);
    setError(null);
    try {
      const response = await fetch("/api/ranking-grid/territorial-actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId,
          territory: {
            city: territory.city,
            urgency: territory.urgency,
            p1: territory.p1,
            p2: territory.p2,
            p3: territory.p3,
            averageRank: territory.averageRank,
            worstRank: territory.worstRank,
            gridCells: territory.gridCells,
          },
          actionCode: recommendation.code,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
      await refresh();
    } catch (cause) {
      setError(cause.message || "Impossible d’ajouter cette action au suivi.");
    } finally {
      setBusy(null);
    }
  }

  async function patch(row, data) {
    setBusy(`patch:${row.id}`);
    setError(null);
    try {
      const response = await fetch(`/api/ranking-grid/territorial-actions/${row.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agencyId, ...data }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
      await refresh();
    } catch (cause) {
      setError(cause.message || "Impossible de mettre à jour cette action.");
    } finally {
      setBusy(null);
    }
  }

  function draftFor(row) {
    return drafts[row.id] || {
      owner: row.owner || "",
      deadline: row.deadline ? String(row.deadline).slice(0, 10) : "",
      userNote: row.metadata?.userNote || "",
    };
  }

  function setDraft(row, field, value) {
    setDrafts((current) => ({
      ...current,
      [row.id]: { ...draftFor(row), [field]: value },
    }));
  }

  const summary = {
    todo: actions.filter((row) => row.status === "todo").length,
    inProgress: actions.filter((row) => row.status === "in_progress").length,
    done: actions.filter((row) => row.status === "done").length,
  };

  return (
    <div className="border-t p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900">Suivi des actions territoriales</h3>
          <p className="mt-1 text-sm text-slate-500">
            Les actions sont rattachées au relevé 14z d’origine. Le prochain relevé comparable mesurera automatiquement le gain sur les mêmes cellules.
          </p>
        </div>
        <div className="flex gap-2 text-xs font-bold">
          <span className="rounded-full bg-slate-100 px-3 py-1">À faire {summary.todo}</span>
          <span className="rounded-full bg-cyan-100 px-3 py-1 text-cyan-900">En cours {summary.inProgress}</span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-900">Terminées {summary.done}</span>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</div>
      ) : null}

      {plan ? (
        <div className="mt-5 space-y-4">
          {(plan.territories || []).map((territory) => (
            <div key={territory.city} className="rounded-xl border border-slate-200 p-4">
              <div className="font-bold text-slate-900">{territory.city}</div>
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {(territory.actions || []).map((recommendation) => {
                  const key = trackedKey(campaignId, territory.city, recommendation.code);
                  const alreadyTracked = tracked.has(key);
                  return (
                    <div key={recommendation.code} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{recommendation.type}</div>
                        <div className="mt-1 text-slate-800">{recommendation.action}</div>
                      </div>
                      <button
                        type="button"
                        disabled={alreadyTracked || busy === `create:${key}`}
                        onClick={() => create(territory, recommendation)}
                        className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {alreadyTracked ? "Suivie" : busy === `create:${key}` ? "Ajout…" : "Suivre"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {actions.length ? actions.map((row) => {
          const metadata = row.metadata || {};
          const draft = draftFor(row);
          return (
            <article key={row.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-slate-900">{metadata.territoryCity || row.title}</strong>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClasses(row.status)}`}>
                      {STATUS_LABELS[row.status] || row.status}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-slate-700">{row.description}</div>
                  <div className="mt-2 text-xs font-semibold text-slate-500">{impactLabel(row.impact)}</div>
                  {row.impact ? (
                    <div className="mt-1 text-xs text-slate-500">
                      Référence #{row.impact.baselineAverageRank ?? "—"} → actuel #{row.impact.currentAverageRank ?? "—"} · {row.impact.improved} améliorée(s), {row.impact.declined} dégradée(s), {row.impact.unchanged} stable(s)
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_LABELS).map(([status, label]) => (
                    <button
                      key={status}
                      type="button"
                      disabled={row.status === status || busy === `patch:${row.id}`}
                      onClick={() => patch(row, { status })}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_2fr_auto]">
                <input
                  value={draft.owner}
                  onChange={(event) => setDraft(row, "owner", event.target.value)}
                  placeholder="Responsable"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={draft.deadline}
                  onChange={(event) => setDraft(row, "deadline", event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  value={draft.userNote}
                  onChange={(event) => setDraft(row, "userNote", event.target.value)}
                  placeholder="Note / action réalisée"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={busy === `patch:${row.id}`}
                  onClick={() => patch(row, draft)}
                  className="rounded-lg bg-[#0f2e46] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  Enregistrer
                </button>
              </div>
            </article>
          );
        }) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
            Aucune recommandation territoriale n’est encore suivie.
          </div>
        )}
      </div>
    </div>
  );
}
