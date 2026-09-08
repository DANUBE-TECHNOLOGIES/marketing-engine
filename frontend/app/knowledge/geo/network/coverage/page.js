"use client";

import { useCallback, useEffect, useState } from "react";

const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 18 };
const headers = { accept: "application/json", "x-tenant-slug": "mondescale" };

export default function NetworkGeoCoveragePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const response = await fetch("/api/knowledge/geo/network/coverage", { cache: "no-store", headers });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "Impossible de charger la couverture GEO réseau.");
      setData(payload?.data || null);
    } catch (e) { setError(e?.message || "Impossible de charger la couverture GEO réseau."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const summary = data?.summary || {};
  return (
    <main style={{ minHeight: "100vh", padding: 32, background: "#f4f6f8", color: "#17202a" }}>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: "0 0 8px" }}>Couverture GEO — réseau</h1>
            <p style={{ margin: 0, color: "#64748b" }}>Lecture seule des faits Knowledge explicites. Une absence est une lacune éditoriale à valider, jamais une invitation à inventer une expertise ou une destination.</p>
          </div>
          <button type="button" onClick={load} disabled={loading}>{loading ? "Actualisation…" : "Actualiser"}</button>
        </header>

        {error ? <div style={{ ...card, color: "#991b1b", marginBottom: 20 }}>{error}</div> : null}

        {data ? <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 22 }}>
            {[
              ["Agences", summary.agencyCount],
              ["Agences sans recommends/features", summary.agenciesWithoutAgencyKnowledge],
              ["Conseillers", summary.personCount],
              ["Conseillers sans expertise", summary.peopleWithoutExpertise],
              ["Conseillers sans agence", summary.peopleWithoutAgency],
              ["Cibles couvertes", summary.coveredTargetCount],
            ].map(([label, value]) => <div key={label} style={card}><div style={{ color: "#64748b", fontSize: 13 }}>{label}</div><strong style={{ display: "block", marginTop: 6, fontSize: 28 }}>{value ?? 0}</strong></div>)}
          </section>

          <section style={{ ...card, marginBottom: 22 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
              <a href="/knowledge/geo/network/agency-knowledge">Corriger destinations & thèmes</a>
              <a href="/knowledge/geo/network/expertise">Corriger expertises</a>
            </div>
            <h2>Couverture par agence</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th align="left">Agence</th><th>Faits agence</th><th>Conseillers</th><th>Expertises</th><th align="left">Exceptions</th></tr></thead>
                <tbody>{(data.agencies || []).map((row) => <tr key={row.agency.id}>
                  <td>{row.agency.title}</td>
                  <td align="center">{row.agencyKnowledgeFactCount}</td>
                  <td align="center">{row.personCount}</td>
                  <td align="center">{row.explicitExpertiseCount}</td>
                  <td>{(row.exceptions || []).length ? row.exceptions.join(" · ") : "—"}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </section>

          <section style={{ ...card, marginBottom: 22 }}>
            <h2>Conseillers sans expertise explicite</h2>
            {(data.agencies || []).flatMap((row) => (row.peopleWithoutExpertise || []).map((person) => ({ ...person, agencyTitle: row.agency.title }))).length
              ? (data.agencies || []).flatMap((row) => (row.peopleWithoutExpertise || []).map((person) => <div key={`${row.agency.id}:${person.id}`} style={{ padding: "6px 0" }}>{person.title} · {row.agency.title}</div>))
              : <p>Aucune lacune explicite sur les conseillers rattachés.</p>}
          </section>

          <section style={card}>
            <h2>Cibles Knowledge déjà couvertes</h2>
            {(data.targets || []).length ? (data.targets || []).map((target) => <div key={target.id} style={{ padding: "6px 0" }}>{target.type} · {target.title} — {target.agencyCount} agence(s) — {(target.relationTypes || []).join(", ")}</div>) : <p>Aucune cible Agency Knowledge explicite.</p>}
          </section>
        </> : loading ? <div style={card}>Chargement…</div> : null}
      </div>
    </main>
  );
}
