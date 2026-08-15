"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { indexationApi } from "../../../lib/indexation-api";

function asArray(value) { return Array.isArray(value) ? value : []; }
function actionFor(run) { return asArray(run?.actions).find((item) => item.type === "seo-opportunity-work-item") || null; }
function statusLabel(status) { return ({ pending: "Nouvelle", planned: "Planifiée", succeeded: "Réalisée", measured: "Mesurée" })[status] || status || "—"; }
function nextStatus(status) { return status === "pending" ? "planned" : status === "planned" ? "succeeded" : status === "succeeded" ? "measured" : null; }
function nextLabel(status) { return ({ pending: "Planifier", planned: "Marquer réalisée", succeeded: "Marquer mesurée" })[status] || null; }

export default function SeoWorkQueueClient() {
  const [payload, setPayload] = useState({ runs: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setPayload(await indexationApi.workQueue({ limit: 100 })); }
    catch (loadError) { setError(loadError.message || "Impossible de charger la file SEO."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const transition = async (run) => {
    const next = nextStatus(run.status);
    if (!next) return;
    setBusy(run.id);
    setError("");
    try {
      await indexationApi.transitionWorkItem({ runId: run.id, status: next });
      await refresh();
    } catch (transitionError) {
      setError(transitionError.message || "Impossible de mettre à jour la tâche SEO.");
    } finally { setBusy(""); }
  };

  const runs = asArray(payload?.runs);

  return <main className="indexation-shell">
    <header className="indexation-hero">
      <div><p className="indexation-eyebrow">MSE-25.22 · SEO Opportunity Work Queue</p><h1>File de travail SEO</h1><p>Transformez les signaux Search Console en actions éditoriales suivies. La file journalise les décisions mais ne publie et ne modifie jamais automatiquement un mini-site.</p></div>
      <div className="indexation-actions"><Link className="indexation-nav-link" href="/indexation/performance">Performance</Link><Link className="indexation-nav-link" href="/indexation">Cockpit</Link></div>
    </header>

    <div className="rollout-safety">Validation humaine obligatoire · aucune mutation automatique du contenu public.</div>
    {error ? <div className="indexation-message indexation-error">{error}</div> : null}
    {loading ? <div className="indexation-empty">Chargement de la file SEO…</div> : null}

    {!loading && runs.length ? <section className="indexation-card performance-table-card">
      <div className="indexation-card-head"><div><h2>{runs.length} tâche{runs.length > 1 ? "s" : ""} SEO</h2><p>Cycle contrôlé : Nouvelle → Planifiée → Réalisée → Mesurée.</p></div><button type="button" onClick={refresh}>Actualiser</button></div>
      <div className="performance-table-wrap"><table className="performance-table"><thead><tr><th>Agence / requête</th><th>Priorité</th><th>Référence Search Console</th><th>Recommandation</th><th>Statut</th><th>Action humaine</th></tr></thead><tbody>{runs.map((run) => { const action = actionFor(run); const opportunity = run?.sourcePlan?.opportunity || {}; const baseline = action?.payload?.baseline || {}; const next = nextLabel(run.status); return <tr key={run.id}><td><strong>{run?.sourcePlan?.siteSlug || "—"}</strong><br />{action?.payload?.query || opportunity.query || "—"}</td><td>{opportunity.priority || action?.priority || "—"}<br /><small>score {Number(opportunity.score || action?.payload?.score || 0)}/100</small></td><td>{Number(baseline.impressions || 0)} impressions<br /><small>position {Number(baseline.position || 0).toFixed(1)} · CTR {(Number(baseline.ctr || 0) * 100).toFixed(1)} %</small></td><td>{opportunity?.action?.label || action?.title || "À analyser"}<br /><small>{opportunity?.action?.rationale || "Décision éditoriale manuelle."}</small></td><td><strong>{statusLabel(run.status)}</strong></td><td>{next ? <button type="button" disabled={busy === run.id} onClick={() => transition(run)}>{busy === run.id ? "Mise à jour…" : next}</button> : <span>Cycle terminé</span>}</td></tr>; })}</tbody></table></div>
    </section> : null}

    {!loading && !runs.length ? <div className="indexation-empty">Aucune tâche SEO. Ajoutez une opportunité depuis l’écran Performance.</div> : null}
  </main>;
}
