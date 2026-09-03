"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { indexationApi } from "../../../lib/indexation-api";

function rows(value) { return Array.isArray(value) ? value : []; }
function statusLabel(status) { return status === "unique" ? "Unique" : status === "review" ? "À revoir" : "Risque de duplication"; }
function percent(value) { return `${Math.round(Number(value || 0) * 100)} %`; }

export default function LocalContentUniquenessClient() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [queued, setQueued] = useState(() => new Set());
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try { setData(await indexationApi.localContentUniqueness()); }
    catch (loadError) { setError(loadError.message || "Impossible de charger l’audit d’unicité locale."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let active = true;
    indexationApi.localContentUniqueness()
      .then((payload) => { if (active) setData(payload); })
      .catch((loadError) => { if (active) setError(loadError.message || "Impossible de charger l’audit d’unicité locale."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const addToQueue = async (site, match) => {
    const otherSlug = match.leftSiteSlug === site.siteSlug ? match.rightSiteSlug : match.leftSiteSlug;
    const otherName = match.leftSiteSlug === site.siteSlug ? match.rightAgencyName || otherSlug : match.leftAgencyName || otherSlug;
    const key = `${site.siteSlug}:${otherSlug}`;
    setBusy(key); setError("");
    try {
      await indexationApi.createWorkItem({
        siteSlug: site.siteSlug,
        opportunity: {
          workKey: `local-content-uniqueness:${otherSlug}`,
          label: `Différencier le contenu de ${site.agencyName || site.siteSlug} vis-à-vis de ${otherName}`,
          sourceType: "local-content-uniqueness",
          priority: match.severity === "critical" || match.severity === "high" ? "high" : "medium",
          score: Math.round(Number(match.similarity || 0) * 100),
          action: {
            label: "Renforcer l’unicité éditoriale locale",
            rationale: `Similarité détectée : ${percent(match.similarity)}. Réécrire humainement les passages génériques avec des informations, expertises et preuves propres à cette agence.`,
          },
        },
      });
      setQueued((current) => new Set([...current, key]));
    } catch (queueError) { setError(queueError.message || "Impossible d’ajouter cette tâche à la file SEO."); }
    finally { setBusy(""); }
  };

  return <main className="indexation-shell">
    <header className="indexation-hero">
      <div><p className="indexation-eyebrow">MSE-25.25 · Local Content Uniqueness</p><h1>Unicité des contenus locaux</h1><p>Compare les pages d’accueil publiées entre agences pour détecter les contenus trop proches. L’objectif est que chaque mini-site exprime une expertise locale propre au lieu de remplacer seulement le nom de la ville.</p></div>
      <div className="indexation-actions"><Link className="indexation-nav-link" href="/indexation/work-queue">File SEO</Link><Link className="indexation-nav-link" href="/indexation/local-seo">Couverture locale</Link><Link className="indexation-nav-link" href="/indexation">Cockpit</Link></div>
    </header>
    <div className="rollout-safety">Audit uniquement : aucune réécriture automatique et aucun contenu publié sans validation humaine.</div>
    {error ? <div className="indexation-message indexation-error">{error}</div> : null}
    {loading ? <div className="indexation-empty">Comparaison des contenus publiés…</div> : null}
    {data ? <>
      <section className="indexation-metrics"><div className="indexation-metric"><strong>{data.summary?.uniqueSites || 0}/{data.summary?.siteCount || 0}</strong><span>mini-sites uniques</span></div><div className="indexation-metric"><strong>{data.summary?.duplicateRiskSites || 0}</strong><span>à risque</span></div><div className="indexation-metric"><strong>{data.summary?.duplicatePairCount || 0}</strong><span>paires proches</span></div><div className="indexation-metric"><strong>{Math.round(Number(data.threshold || 0) * 100)} %</strong><span>seuil de similarité</span></div></section>
      <section className="indexation-card performance-table-card"><div className="indexation-card-head"><div><h2>Différenciation éditoriale du réseau</h2><p>Analyse des pages d’accueil publiées avec comparaison par groupes de mots, au-delà du simple nom de ville.</p></div><button type="button" onClick={load}>Actualiser</button></div><div className="performance-table-wrap"><table className="performance-table"><thead><tr><th>Agence</th><th>Statut</th><th>Volume</th><th>Similarité maximale</th><th>Agences proches / action</th></tr></thead><tbody>{rows(data.sites).map((site) => <tr key={site.siteSlug}><td><strong>{site.agencyName || site.siteSlug}</strong><br /><small>{site.city || "Ville non renseignée"}</small></td><td>{statusLabel(site.status)}</td><td>{site.homepageWordCount || 0} mots</td><td>{percent(site.strongestSimilarity)}</td><td>{site.matches?.length ? <ul>{site.matches.map((match) => { const otherSlug = match.leftSiteSlug === site.siteSlug ? match.rightSiteSlug : match.leftSiteSlug; const other = match.leftSiteSlug === site.siteSlug ? match.rightAgencyName || otherSlug : match.leftAgencyName || otherSlug; const key = `${site.siteSlug}:${otherSlug}`; const done = queued.has(key); return <li key={key}>{other} ({percent(match.similarity)}) <button type="button" disabled={done || busy === key} onClick={() => addToQueue(site, match)}>{done ? "Dans la file" : busy === key ? "Ajout…" : "Créer une tâche SEO"}</button></li>; })}</ul> : "Aucune similarité critique"}</td></tr>)}</tbody></table></div></section>
    </> : null}
  </main>;
}
