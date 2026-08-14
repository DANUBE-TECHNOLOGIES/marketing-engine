"use client";

import { useMemo, useState } from "react";

function eligibleForFreshCycle(row) {
  const run = row?.run;
  return (
    row?.site?.readyToSubmit === true &&
    (!run || run.status === "failed")
  );
}

export default function IndexationRolloutPlanner({
  rows,
  preflights,
  siteUrl,
  onPreflight,
  onPrepare,
}) {
  const eligibleRows = useMemo(
    () => rows.filter(eligibleForFreshCycle),
    [rows]
  );
  const [selected, setSelected] = useState([]);
  const [running, setRunning] = useState("");
  const [summary, setSummary] = useState(null);

  const selectedRows = useMemo(
    () => eligibleRows.filter((row) => selected.includes(row.site.siteSlug)),
    [eligibleRows, selected]
  );

  const selectedPreflightReady = selectedRows.filter(
    (row) => preflights[row.site.siteSlug]?.ready === true
  );

  const toggle = (slug) => {
    setSelected((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug]
    );
  };

  const selectAll = () => {
    setSelected(eligibleRows.map((row) => row.site.siteSlug));
    setSummary(null);
  };

  const clear = () => {
    setSelected([]);
    setSummary(null);
  };

  const runPreflights = async () => {
    if (!siteUrl || !selectedRows.length || running) return;
    setRunning("preflight");
    setSummary(null);

    const results = [];
    for (const row of selectedRows) {
      const result = await onPreflight(row.site);
      results.push({
        siteSlug: row.site.siteSlug,
        ok: result?.ready === true,
      });
    }

    setSummary({
      operation: "preflight",
      total: results.length,
      succeeded: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
    });
    setRunning("");
  };

  const prepareSelected = async () => {
    if (!selectedPreflightReady.length || running) return;
    setRunning("prepare");
    setSummary(null);

    const results = [];
    for (const row of selectedPreflightReady) {
      const result = await onPrepare(row.site);
      results.push({
        siteSlug: row.site.siteSlug,
        ok: Boolean(result),
      });
    }

    setSummary({
      operation: "prepare",
      total: results.length,
      succeeded: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
    });
    setRunning("");
  };

  if (!eligibleRows.length) return null;

  return (
    <section className="rollout-panel" aria-label="Déploiement contrôlé de l’indexation">
      <div className="rollout-head">
        <div>
          <p className="indexation-eyebrow">MSE-25.18 · Déploiement contrôlé</p>
          <h2>Préparer une vague d’indexation</h2>
          <p>
            Sélectionnez les agences à traiter. Les préflights et préparations sont exécutés
            séquentiellement. L’approbation et la soumission Google restent obligatoirement individuelles.
          </p>
        </div>
        <div className="rollout-counter">
          <strong>{selectedRows.length}</strong>
          <span>sélectionnées</span>
        </div>
      </div>

      <div className="rollout-toolbar">
        <button type="button" className="indexation-secondary" onClick={selectAll} disabled={Boolean(running)}>
          Sélectionner les {eligibleRows.length} agences prêtes
        </button>
        <button type="button" className="indexation-secondary" onClick={clear} disabled={!selected.length || Boolean(running)}>
          Effacer la sélection
        </button>
        <button type="button" onClick={runPreflights} disabled={!siteUrl || !selectedRows.length || Boolean(running)}>
          {running === "preflight" ? "Préflights en cours…" : "Préflight de la sélection"}
        </button>
        <button type="button" onClick={prepareSelected} disabled={!selectedPreflightReady.length || Boolean(running)}>
          {running === "prepare" ? "Préparations en cours…" : `Préparer ${selectedPreflightReady.length} run${selectedPreflightReady.length > 1 ? "s" : ""}`}
        </button>
      </div>

      <div className="rollout-sites">
        {eligibleRows.map((row) => {
          const slug = row.site.siteSlug;
          const checked = selected.includes(slug);
          const preflightReady = preflights[slug]?.ready === true;
          return (
            <label key={slug} className={`rollout-site ${checked ? "rollout-site-selected" : ""}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(slug)}
                disabled={Boolean(running)}
              />
              <span>
                <strong>{row.site.siteName || row.site.agencyName || slug}</strong>
                <small>{slug}</small>
              </span>
              <em>{preflightReady ? "Préflight validé" : row.run?.status === "failed" ? "À reprendre" : "Prête"}</em>
            </label>
          );
        })}
      </div>

      {summary ? (
        <div className={`rollout-summary ${summary.failed ? "rollout-summary-warning" : "rollout-summary-ok"}`}>
          <strong>{summary.operation === "preflight" ? "Préflights" : "Préparations"} terminés</strong>
          <span>{summary.succeeded}/{summary.total} réussis{summary.failed ? ` · ${summary.failed} échec${summary.failed > 1 ? "s" : ""}` : ""}</span>
        </div>
      ) : null}

      <div className="rollout-safety">
        Aucun bouton de cette zone n’approuve ni ne soumet un sitemap à Google Search Console.
      </div>
    </section>
  );
}
