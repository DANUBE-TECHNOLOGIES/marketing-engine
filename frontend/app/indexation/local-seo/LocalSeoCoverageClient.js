"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { indexationApi } from "../../../lib/indexation-api";

function sites(value) { return Array.isArray(value) ? value : []; }
function statusLabel(value) { return value === "strong" ? "Solide" : value === "improvable" ? "À renforcer" : "Faible"; }
function mark(value) { return value ? "✓" : "✕"; }

export default function LocalSeoCoverageClient() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => { setLoading(true); setError(""); try { setData(await indexationApi.localSeoCoverage()); } catch (loadError) { setError(loadError.message || "Impossible de charger l’audit SEO local."); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  return <main className="indexation-shell">
    <header className="indexation-hero"><div><p className="indexation-eyebrow">MSE-25.24 · Local SEO Coverage</p><h1>Couverture SEO locale</h1><p>Contrôle les signaux géographiques réellement présents dans les pages publiées : contenu, H1, NAP et données structurées locales. Une lacune produit une recommandation, jamais une page locale automatique.</p></div><div className="indexation-actions"><Link className="indexation-nav-link" href="/indexation/performance">Performance</Link><Link className="indexation-nav-link" href="/indexation">Cockpit</Link></div></header>
    <div className="rollout-safety">Objectif : pertinence locale forte, contenu utile et unique — aucune doorway page générée automatiquement.</div>
    {error ? <div className="indexation-message indexation-error">{error}</div> : null}
    {loading ? <div className="indexation-empty">Audit des mini-sites publiés…</div> : null}
    {data ? <>
      <section className="indexation-metrics"><div className="indexation-metric"><strong>{data.summary?.averageScore || 0}/100</strong><span>score moyen réseau</span></div><div className="indexation-metric"><strong>{data.summary?.strong || 0}</strong><span>mini-sites solides</span></div><div className="indexation-metric"><strong>{data.summary?.napComplete || 0}/{data.summary?.siteCount || 0}</strong><span>NAP complets</span></div><div className="indexation-metric"><strong>{data.summary?.structuredDataComplete || 0}/{data.summary?.siteCount || 0}</strong><span>schemas locaux complets</span></div></section>
      <section className="indexation-card performance-table-card"><div className="indexation-card-head"><div><h2>Matrice de couverture locale</h2><p>Ville principale, title, meta, H1, contenu publié, NAP, TravelAgency/LocalBusiness et zones non couvertes.</p></div><button type="button" onClick={load}>Actualiser</button></div><div className="performance-table-wrap"><table className="performance-table"><thead><tr><th>Agence</th><th>Score</th><th>Signaux page principale</th><th>NAP</th><th>JSON-LD local</th><th>Zones manquantes</th><th>Priorités</th></tr></thead><tbody>{sites(data.sites).map((site) => { const home = sites(site.pages)[0] || {}; const schema = site.structuredData || {}; return <tr key={site.siteSlug}><td><strong>{site.agencyName || site.siteSlug}</strong><br /><small>{site.primaryCity || "Ville non renseignée"} · {site.publishedPageCount} page(s)</small></td><td><strong>{site.score}/100</strong><br /><small>{statusLabel(site.status)}</small></td><td>{mark(home.hasPrimaryCityInTitle)} title · {mark(home.hasPrimaryCityInMeta)} meta<br />{mark(home.hasH1)} H1 · {mark(home.hasPrimaryCityInH1)} H1 local · {mark(home.hasPrimaryCityInContent)} contenu local</td><td>{mark(site.nap?.complete)} nom/adresse/tél.{site.nap?.missing?.length ? <><br /><small>Manque : {site.nap.missing.join(", ")}</small></> : null}</td><td>{mark(schema.hasTravelAgency)} TravelAgency · {mark(schema.hasLocalBusiness)} LocalBusiness<br />{mark(schema.hasAddress)} adresse · {mark(schema.hasTelephone)} téléphone · {mark(schema.hasAreaServed)} areaServed</td><td>{site.missingCities?.length ? site.missingCities.join(", ") : "Aucune"}</td><td>{site.gaps?.length ? <ul>{site.gaps.slice(0, 5).map((gap) => <li key={`${gap.code}-${gap.city || ""}`}>{gap.message}</li>)}</ul> : "Couverture locale solide"}</td></tr>; })}</tbody></table></div></section>
    </> : null}
  </main>;
}
