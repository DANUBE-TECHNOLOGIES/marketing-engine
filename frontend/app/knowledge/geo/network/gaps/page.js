"use client";

import { useCallback, useEffect, useState } from "react";

const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 18 };
const headers = { accept: "application/json", "x-tenant-slug": "mondescale" };

function displayDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("fr-FR");
}

export default function NetworkGeoKnowledgeGapsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/knowledge/geo/network/agent-gaps?limit=100", {
        cache: "no-store",
        headers,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "Impossible de charger les questions non couvertes.");
      setData(payload?.data || null);
    } catch (e) {
      setError(e?.message || "Impossible de charger les questions non couvertes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <main style={{ minHeight: "100vh", padding: 32, background: "#f4f6f8", color: "#17202a" }}>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: "0 0 8px" }}>Questions non couvertes — réseau</h1>
            <p style={{ margin: 0, color: "#64748b" }}>
              Questions réellement recherchées par l’agent sans fait canonique correspondant. Elles constituent un signal éditorial à examiner, jamais une suggestion automatique ni un fait à publier tel quel.
            </p>
          </div>
          <button type="button" onClick={load} disabled={loading}>{loading ? "Actualisation…" : "Actualiser"}</button>
        </header>

        {error ? <div style={{ ...card, color: "#991b1b", marginBottom: 20 }}>{error}</div> : null}

        {data ? <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 22 }}>
            <div style={card}><div style={{ color: "#64748b", fontSize: 13 }}>Recherches inconnues</div><strong style={{ display: "block", marginTop: 6, fontSize: 28 }}>{data.totalUnknownSearches ?? 0}</strong></div>
            <div style={card}><div style={{ color: "#64748b", fontSize: 13 }}>Lacunes uniques affichées</div><strong style={{ display: "block", marginTop: 6, fontSize: 28 }}>{data.uniqueGapCount ?? 0}</strong></div>
          </section>

          <section style={{ ...card, marginBottom: 22 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
              <a href="/knowledge/geo/network/agency-knowledge">Destinations & thèmes</a>
              <a href="/knowledge/geo/network/expertise">Expertises</a>
              <a href="/knowledge/geo/network/coverage">Couverture GEO</a>
            </div>
            <h2>Demandes à examiner</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th align="left">Agence</th>
                    <th align="left">Question non couverte</th>
                    <th>Occurrences</th>
                    <th align="left">Première</th>
                    <th align="left">Dernière</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.gaps || []).map((gap) => (
                    <tr key={`${gap.siteSlug || "network"}:${gap.normalizedQuery}`}>
                      <td>{gap.siteSlug || "Réseau"}</td>
                      <td>{gap.query}</td>
                      <td align="center">{gap.occurrences}</td>
                      <td>{displayDate(gap.firstSeenAt)}</td>
                      <td>{displayDate(gap.lastSeenAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!(data.gaps || []).length ? <p>Aucune question non couverte enregistrée.</p> : null}
          </section>

          <section style={card}>
            <strong>Règle de traitement</strong>
            <p style={{ marginBottom: 0, color: "#64748b" }}>
              Une question fréquente doit être vérifiée humainement puis, si le fait est réel et utile, ajoutée dans le Knowledge Graph via les matrices explicites. Cette page ne crée ni relation, ni expertise, ni destination.
            </p>
          </section>
        </> : loading ? <div style={card}>Chargement…</div> : null}
      </div>
    </main>
  );
}
