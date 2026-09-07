"use client";

import { useCallback, useEffect, useState } from "react";

const box = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 18,
};

export default function NetworkGeoPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/knowledge/geo/network/report", {
        cache: "no-store",
        headers: {
          accept: "application/json",
          "x-tenant-slug": "mondescale",
        },
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message || "Impossible de charger le rapport GEO réseau.");
      }
      setData(payload?.data || null);
    } catch (loadError) {
      setError(loadError?.message || "Impossible de charger le rapport GEO réseau.");
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
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 24 }}>
          <div>
            <a href="/knowledge">← Knowledge Studio</a>
            <h1 style={{ margin: "12px 0 6px" }}>GEO réseau Mondescale</h1>
            <p style={{ margin: 0, color: "#64748b" }}>
              Rapport de réconciliation en lecture seule. Aucune écriture Knowledge n’est déclenchée depuis cette page.
            </p>
          </div>
          <button type="button" onClick={load} disabled={loading} style={{ padding: "10px 16px", borderRadius: 10, border: 0, cursor: "pointer", fontWeight: 700 }}>
            {loading ? "Actualisation…" : "Actualiser"}
          </button>
        </div>

        {error ? <div style={{ ...box, borderColor: "#fecaca", color: "#991b1b", marginBottom: 20 }}>{error}</div> : null}

        {data ? (
          <>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 22 }}>
              {[
                ["Agences sources", summary.sourceAgencyCount],
                ["Éligibles GEO", summary.eligibleAgencyCount],
                ["Bloquées", summary.blockedAgencyCount],
                ["Actions nécessaires", summary.actionable],
                ["Déjà conformes", summary.noop],
                ["Conseillers explicites", summary.explicitMembers],
                ["Conseillers liés", summary.linkedMembers],
                ["À lier", summary.unlinkedMembers],
              ].map(([label, value]) => (
                <div key={label} style={box}>
                  <div style={{ color: "#64748b", fontSize: 13 }}>{label}</div>
                  <strong style={{ display: "block", marginTop: 6, fontSize: 28 }}>{value ?? 0}</strong>
                </div>
              ))}
            </section>

            <section style={{ ...box, overflowX: "auto", marginBottom: 22 }}>
              <h2 style={{ marginTop: 0 }}>Agences</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1050 }}>
                <thead>
                  <tr>
                    {["Agence", "Ville SEO", "Villes cibles", "Actions", "Conforme", "Équipe", "Liés", "À lier", "Expertise"].map((label) => (
                      <th key={label} style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#64748b" }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.agencies || []).map((agency) => (
                    <tr key={agency.agencyId}>
                      <td style={{ padding: 8, borderBottom: "1px solid #edf2f7" }}><strong>{agency.agencyName}</strong><br /><small>{agency.siteSlug}</small></td>
                      <td style={{ padding: 8, borderBottom: "1px solid #edf2f7" }}>{agency.seoCity}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #edf2f7" }}>{agency.targetCities?.join(", ") || "—"}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #edf2f7" }}>{agency.summary?.actionable ?? 0}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #edf2f7" }}>{agency.summary?.noop ?? 0}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #edf2f7" }}>{agency.team?.explicitMembers ?? 0}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #edf2f7" }}>{agency.team?.linkedMembers ?? 0}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #edf2f7" }}>{agency.team?.unlinkedMembers ?? 0}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #edf2f7" }}>Aucune inférée</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {data.blocked?.length ? (
              <section style={box}>
                <h2 style={{ marginTop: 0 }}>Agences bloquées</h2>
                {data.blocked.map((agency) => (
                  <p key={`${agency.agencyId}-${agency.agencyName}`}>
                    <strong>{agency.agencyName || `Agence ${agency.agencyId}`}</strong> — {agency.reason}
                  </p>
                ))}
              </section>
            ) : null}
          </>
        ) : loading ? <div style={box}>Chargement du réseau…</div> : null}
      </div>
    </main>
  );
}
