"use client";

import { useCallback, useEffect, useState } from "react";

const card = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 18,
};

const STATUS_LABEL = {
  ready: "Prête",
  partial: "Partielle",
  blocked: "Bloquée",
};

export default function NetworkPublicReadinessPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/knowledge/geo/network/public-readiness", {
        cache: "no-store",
        headers: {
          accept: "application/json",
          "x-tenant-slug": "mondescale",
        },
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message || "Impossible de charger la readiness GEO publique.");
      }
      setData(payload?.data || null);
    } catch (loadError) {
      setError(loadError?.message || "Impossible de charger la readiness GEO publique.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary || {};

  return (
    <main style={{ minHeight: "100vh", padding: 32, background: "#f4f6f8", color: "#17202a" }}>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <div>
            <a href="/knowledge/geo/network">← GEO réseau</a>
            <h1 style={{ margin: "12px 0 6px" }}>Readiness GEO publique — réseau</h1>
            <p style={{ margin: 0, color: "#64748b" }}>
              Contrôle read-only du graphe réellement généré pour les mini-sites publiés. Aucune expertise n’est requise ou inférée.
            </p>
          </div>
          <button type="button" onClick={load} disabled={loading} style={{ padding: "10px 16px", border: 0, borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
            {loading ? "Actualisation…" : "Actualiser"}
          </button>
        </header>

        {error ? <div style={{ ...card, color: "#991b1b", borderColor: "#fecaca", marginBottom: 20 }}>{error}</div> : null}

        {data ? (
          <>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 22 }}>
              {[
                ["Mini-sites publiés", summary.publishedSiteCount],
                ["Prêts", summary.readyCount],
                ["Partiels", summary.partialCount],
                ["Bloqués", summary.blockedCount],
                ["Score moyen", `${summary.averageScore ?? 0}/100`],
                ["Person publiques", summary.publicPersonCount],
                ["Person liées Knowledge", summary.knowledgeLinkedPersonCount],
                ["Zones areaServed", summary.areaServedCount],
              ].map(([label, value]) => (
                <div key={label} style={card}>
                  <div style={{ color: "#64748b", fontSize: 13 }}>{label}</div>
                  <strong style={{ display: "block", marginTop: 6, fontSize: 28 }}>{value ?? 0}</strong>
                </div>
              ))}
            </section>

            <section style={{ ...card, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
                <thead>
                  <tr>
                    {["Agence", "Statut", "Score", "areaServed", "Person", "Knowledge liées", "knowsAbout", "Exceptions"].map((label) => (
                      <th key={label} style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#64748b" }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.agencies || []).map((agency) => (
                    <tr key={agency.siteSlug}>
                      <td style={{ padding: 10, borderBottom: "1px solid #edf2f7" }}><strong>{agency.agencyName}</strong><br /><small>{agency.siteSlug}</small></td>
                      <td style={{ padding: 10, borderBottom: "1px solid #edf2f7" }}>{STATUS_LABEL[agency.status] || agency.status}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #edf2f7" }}>{agency.score}/100</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #edf2f7" }}>{agency.metrics?.areaServed?.join(", ") || "—"}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #edf2f7" }}>{agency.metrics?.publicPersonCount ?? 0}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #edf2f7" }}>{agency.metrics?.knowledgeLinkedPersonCount ?? 0}/{agency.metrics?.explicitTeamMemberCount ?? 0}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #edf2f7" }}>{agency.metrics?.knowsAboutCount ?? 0}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #edf2f7" }}>
                        {agency.issues?.length
                          ? agency.issues.map((issue) => issue.message).join(" · ")
                          : "Aucune"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <p style={{ marginTop: 16, color: "#64748b" }}>
              `knowsAbout` est purement informatif : une valeur à zéro ne dégrade pas la readiness tant qu’aucune expertise n’a été explicitement validée.
            </p>
          </>
        ) : loading ? <div style={card}>Analyse des mini-sites publiés…</div> : null}
      </div>
    </main>
  );
}
