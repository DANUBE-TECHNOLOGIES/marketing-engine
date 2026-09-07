"use client";

import { useCallback, useEffect, useState } from "react";

const card = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 18,
};

const LABELS = {
  linked: "Déjà lié",
  canonical_match: "Person canonique trouvée",
  new_candidate: "Nouveau profil candidat",
  ambiguous: "À vérifier",
};

export default function NetworkPeoplePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/knowledge/geo/network/people-report", {
        cache: "no-store",
        headers: {
          accept: "application/json",
          "x-tenant-slug": "mondescale",
        },
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message || "Impossible de charger la réconciliation Person réseau.");
      }
      setData(payload?.data || null);
    } catch (loadError) {
      setError(loadError?.message || "Impossible de charger la réconciliation Person réseau.");
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
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <a href="/knowledge/geo/network">← GEO réseau</a>
            <h1 style={{ margin: "12px 0 6px" }}>Réconciliation conseillers — réseau</h1>
            <p style={{ margin: 0, color: "#64748b" }}>
              Une seule passe sur tous les blocs équipe publiés. Rapport strictement en lecture seule : aucune Person, liaison ou expertise n’est créée ici.
            </p>
          </div>
          <button type="button" onClick={load} disabled={loading} style={{ padding: "10px 16px", border: 0, borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
            {loading ? "Actualisation…" : "Actualiser"}
          </button>
        </header>

        {error ? <div style={{ ...card, color: "#991b1b", borderColor: "#fecaca", marginBottom: 20 }}>{error}</div> : null}

        {data ? (
          <>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
              {[
                ["Agences analysées", summary.agencyCount],
                ["Conseillers explicites", summary.explicitMemberCount],
                ["Déjà liés", summary.linked],
                ["Person exactes", summary.canonicalMatch],
                ["Nouveaux candidats", summary.newCandidate],
                ["À vérifier", summary.ambiguous],
              ].map(([label, value]) => (
                <div key={label} style={card}>
                  <div style={{ color: "#64748b", fontSize: 13 }}>{label}</div>
                  <strong style={{ display: "block", marginTop: 6, fontSize: 28 }}>{value ?? 0}</strong>
                </div>
              ))}
            </section>

            {(data.agencies || []).map((agency) => (
              <section key={agency.agencyId} style={{ ...card, marginBottom: 18 }}>
                <h2 style={{ marginTop: 0 }}>{agency.agencyName}</h2>
                <p style={{ color: "#64748b" }}>
                  {agency.counts.linked} lié(s) · {agency.counts.canonicalMatch} correspondance(s) canonique(s) · {agency.counts.newCandidate} nouveau(x) candidat(s) · {agency.counts.ambiguous} à vérifier
                </p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                    <thead>
                      <tr>
                        {["Conseiller", "État", "Slug canonique", "Knowledge", "Raison"].map((label) => (
                          <th key={label} style={{ textAlign: "left", padding: 9, borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: 12 }}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(agency.members || []).map((member, index) => (
                        <tr key={`${member.name}-${index}`}>
                          <td style={{ padding: 9, borderBottom: "1px solid #edf2f7" }}><strong>{member.name}</strong></td>
                          <td style={{ padding: 9, borderBottom: "1px solid #edf2f7" }}>{LABELS[member.status] || member.status}</td>
                          <td style={{ padding: 9, borderBottom: "1px solid #edf2f7" }}>{member.candidateSlug || "—"}</td>
                          <td style={{ padding: 9, borderBottom: "1px solid #edf2f7" }}>{member.matchedEntity?.id || member.knowledgeEntityId || "—"}</td>
                          <td style={{ padding: 9, borderBottom: "1px solid #edf2f7" }}>{member.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </>
        ) : loading ? <div style={card}>Analyse réseau des conseillers…</div> : null}
      </div>
    </main>
  );
}
