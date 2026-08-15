"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { indexationApi } from "../../../lib/indexation-api";

function sites(value) { return Array.isArray(value) ? value : []; }
function statusLabel(value) { return value === "strong" ? "Solide" : value === "improvable" ? "À renforcer" : "Faible"; }

export default function LocalSeoCoverageClient() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setData(await indexationApi.localSeoCoverage()); }
    catch (loadError) { setError(loadError.message || "Impossible de charger l’audit SEO local."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return <main className="indexation-shell">
    <header className="indexation-hero"><div><p className="indexation-eyebrow">MSE-25.24 · Local SEO Coverage</p><h1>Couverture SEO locale</h1><p>Contrôle les signaux géographiques réellement présents dans les pages publiées. Une lacune produit une recommandation, jamais une page locale automatique.</p></div><div className="indexation-actions"><Link className="indexation-nav-link" href="/indexation/performance">Performance</Link><Link className="indexation-nav-link" href="/indexation">Cockpit</Link></div></header>
    <div className="rollout-safety">Objectif : pertinence locale forte, contenu utile et unique — aucune doorway page générée automatiquement.</div>
    {error ? <div className="indexation-message indexation-error">{error}</div> : null}
    {loading ? <div className="indexation-empty">Audit des mini-sites publiés…</div> : null}
    {data ? <>
      <section className="indexation-metrics"><div className="indexation-metric"><strong>{data.summary?.averageScore || 0}/100</strong><span>score moyen réseau</span></div><div className="indexation-metric"><strong>{data.summary?.strong || 0}</strong><span>mini-sites solides</span></div><div className="indexation-metric"><strong>{data.summary?.improvable || 0}</strong><span>à renforcer</span></div><div className="indexation-metric"><strong>{data.summary?.weak || 0}</strong><span>faibles</span></div></section>
      <section className="indexation-card performance-table-card"><div className="indexation-card-head"><div><h2>Matrice de couverture locale</h2><p>Ville principale, title, meta, contenu publié et zones non couvertes.</p></div><button type="button" onClick={load}>Actualiser</button></div><div className="performance-table-wrap"><table className="performance-table"><thead><tr><th>Agence</th><th>Score</th><th>Ville principale</th><th>Title / Meta / Contenu</th><th>Lacunes géographiques</th><th>Priorités</th></tr></thead><tbody>{sites(data.sites).map((site) => { const home = sites(site.pages)[0] || {}; return <tr key={site.siteSlug}><td><strong>{site.agencyName || site.siteSlug}</strong><br /><small>{site.publishedPageCount} page(s) publiée(s)</small></td><td><strong>{site.score}/100</strong><br /><small>{statusLabel(site.status)}</small></td><td>{site.primaryCity || "Non renseignée"}</td><td>{home.hasPrimaryCityInTitle ? "✓" : "✕"} title · {home.hasPrimaryCityInMeta ? "✓" : "✕"} meta · {home.hasPrimaryCityInContent ? "✓" : "✕"} contenu</td><td>{site.missingCities?.length ? site.missingCities.join(", ") : "Aucune"}</td><td>{site.gaps?.length ? <ul>{site.gaps.slice(0, 4).map((gap) => <li key={`${gap.code}-${gap.city || ""}`}>{gap.message}</li>)}</ul> : "Couverture locale solide"}</td></tr>; })}</tbody></table></div></section>
    </> : null}
  </main>;
}
