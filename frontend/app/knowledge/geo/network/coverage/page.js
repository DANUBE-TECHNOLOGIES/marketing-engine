"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 18 };
const headers = { accept: "application/json", "x-tenant-slug": "mondescale" };

export default function NetworkKnowledgeCoveragePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const response = await fetch("/api/knowledge/geo/network/agency-knowledge-coverage", {
        cache: "no-store",
        headers,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "Impossible de charger la couverture GEO réseau.");
      setData(payload?.data || null);
    } catch (e) {
      setError(e?.message || "Impossible de charger la couverture GEO réseau.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const types = useMemo(() => [...new Set((data?.items || []).map((item) => item.target?.type).filter(Boolean))].sort(), [data]);
  const items = useMemo(() => (data?.items || []).filter((item) => typeFilter === "all" || item.target?.type === typeFilter), [data, typeFilter]);

  function prepareMissing(item) {
    if (!item?.missingAgencyKnowledgeIds?.length) return;
    const params = new URLSearchParams({
      bulkAgencies: item.missingAgencyKnowledgeIds.join(","),
      bulkTarget: item.target.id,
      bulkRelation: "recommends",
    });
    window.location.href = `/knowledge/geo/network/agency-knowledge?${params.toString()}`;
  }

  const summary = data?.summary || {};
  return (
    <main style={{ minHeight: "100vh", padding: 32, background: "#f4f6f8", color: "#17202a" }}>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: "0 0 8px" }}>Couverture GEO — réseau</h1>
            <p style={{ margin: 0, color: "#64748b" }}>Lecture des seules relations Agency Knowledge explicites. Aucun score d’expertise, aucune suggestion automatique et aucune écriture depuis cette vue.</p>
          </div>
          <button type="button" onClick={load} disabled={loading}>{loading ? "Actualisation…" : "Actualiser"}</button>
        </header>

        {error ? <div style={{ ...card, color: "#991b1b", borderColor: "#fecaca", marginBottom: 20 }}>{error}</div> : null}

        {data ? <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 22 }}>
            {[
              ["Agences", summary.agencyCount],
              ["Cibles", summary.targetCount],
              ["100 % couvertes", summary.fullyCoveredTargetCount],
              ["Avec trous", summary.targetWithGapsCount],
              ["0 % couvertes", summary.uncoveredTargetCount],
            ].map(([label, value]) => <div key={label} style={card}><div style={{ color: "#64748b", fontSize: 13 }}>{label}</div><strong style={{ display: "block", marginTop: 6, fontSize: 28 }}>{value ?? 0}</strong></div>)}
          </section>

          <section style={{ ...card, marginBottom: 18 }}>
            <label>Type de cible&nbsp; <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="all">Tous</option>
              {types.map((type) => <option key={type} value={type}>{type}</option>)}
            </select></label>
          </section>

          {items.map((item) => <section key={item.target.id} style={{ ...card, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: "0 0 6px" }}>{item.target.title}</h2>
                <div style={{ color: "#64748b" }}>{item.target.type} · {item.target.slug}</div>
              </div>
              <strong style={{ fontSize: 24 }}>{item.coverageRate}%</strong>
            </div>
            <p>{item.coveredCount}/{item.agencyCount} agence(s) avec au moins une relation publique explicite · {item.missingCount} manquante(s).</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
              <div><strong>recommends ({item.recommends.length})</strong><div>{item.recommends.map((agency) => agency.title).join(", ") || "—"}</div></div>
              <div><strong>features ({item.features.length})</strong><div>{item.features.map((agency) => agency.title).join(", ") || "—"}</div></div>
              <div><strong>available_in seul ({item.availableInOnly.length})</strong><div>{item.availableInOnly.map((agency) => agency.title).join(", ") || "—"}</div></div>
              <div><strong>Sans relation ({item.missing.length})</strong><div>{item.missing.map((agency) => agency.title).join(", ") || "—"}</div></div>
            </div>
            {item.missingCount > 0 ? <button type="button" onClick={() => prepareMissing(item)} style={{ marginTop: 14, padding: "9px 12px", fontWeight: 700 }}>Préparer les agences manquantes dans le bulk</button> : null}
          </section>)}
        </> : loading ? <div style={card}>Chargement de la couverture réseau…</div> : null}
      </div>
    </main>
  );
}
