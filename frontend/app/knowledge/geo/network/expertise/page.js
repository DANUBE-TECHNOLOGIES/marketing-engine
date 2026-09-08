"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const card = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 18,
};

const headers = {
  accept: "application/json",
  "x-tenant-slug": "mondescale",
};

export default function NetworkExpertisePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [selection, setSelection] = useState({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/knowledge/geo/network/expertise-matrix", {
        cache: "no-store",
        headers,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "Impossible de charger la matrice d’expertises.");
      setData(payload?.data || null);
    } catch (loadError) {
      setError(loadError?.message || "Impossible de charger la matrice d’expertises.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const expertiseById = useMemo(
    () => new Map((data?.expertise || []).map((item) => [item.id, item])),
    [data]
  );

  async function addExpertise(person) {
    const expertiseId = selection[person.id];
    if (!expertiseId) return;
    const expertise = expertiseById.get(expertiseId);
    if (!expertise) return;

    const confirmed = window.confirm(
      `Confirmer explicitement : ${person.title} est expert(e) de « ${expertise.title} » ?`
    );
    if (!confirmed) return;

    try {
      setSaving(person.id);
      setError("");
      const response = await fetch("/api/knowledge/geo/network/expertise-links", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ personId: person.id, expertiseId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "Impossible d’ajouter l’expertise explicite.");
      setSelection((current) => ({ ...current, [person.id]: "" }));
      await load();
    } catch (saveError) {
      setError(saveError?.message || "Impossible d’ajouter l’expertise explicite.");
    } finally {
      setSaving("");
    }
  }

  const summary = data?.summary || {};

  return (
    <main style={{ minHeight: "100vh", padding: 32, background: "#f4f6f8", color: "#17202a" }}>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: "0 0 8px" }}>Expertises explicites — réseau</h1>
            <p style={{ margin: 0, color: "#64748b" }}>
              Aucune expertise n’est déduite d’un avis, d’une bio, d’un ranking ou d’un texte libre. Chaque relation expert_in est ajoutée par validation humaine explicite entre deux entités Knowledge publiées.
            </p>
          </div>
          <button type="button" onClick={load} disabled={loading} style={{ padding: "10px 16px", border: 0, borderRadius: 10, fontWeight: 700 }}>
            {loading ? "Actualisation…" : "Actualiser"}
          </button>
        </header>

        {error ? <div style={{ ...card, color: "#991b1b", borderColor: "#fecaca", marginBottom: 20 }}>{error}</div> : null}

        {data ? (
          <>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 22 }}>
              {[
                ["Conseillers publiés", summary.personCount],
                ["Rattachés à une agence", summary.eligiblePersonCount],
                ["Conseillers bloqués", summary.blockedPersonCount],
                ["Expertises publiées", summary.expertiseCount],
                ["Relations expert_in", summary.explicitExpertInCount],
              ].map(([label, value]) => (
                <div key={label} style={card}>
                  <div style={{ color: "#64748b", fontSize: 13 }}>{label}</div>
                  <strong style={{ display: "block", marginTop: 6, fontSize: 28 }}>{value ?? 0}</strong>
                </div>
              ))}
            </section>

            {(data.people || []).map((row) => {
              const existingIds = new Set((row.expertises || []).map((item) => item.id));
              const available = (data.expertise || []).filter((item) => !existingIds.has(item.id));
              return (
                <section key={row.person.id} style={{ ...card, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
                    <div>
                      <h2 style={{ margin: 0 }}>{row.person.title}</h2>
                      <div style={{ color: "#64748b", marginTop: 5 }}>{row.agency?.title || "Aucune Agency Knowledge publiée via works_at"}</div>
                      <div style={{ marginTop: 12 }}>
                        {(row.expertises || []).length
                          ? row.expertises.map((item) => <span key={item.id} style={{ display: "inline-block", margin: "0 8px 8px 0", padding: "5px 9px", border: "1px solid #cbd5e1", borderRadius: 999 }}>{item.title}</span>)
                          : <span style={{ color: "#64748b" }}>Aucune expertise explicite.</span>}
                      </div>
                    </div>

                    {row.eligible ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <select
                          value={selection[row.person.id] || ""}
                          onChange={(event) => setSelection((current) => ({ ...current, [row.person.id]: event.target.value }))}
                          style={{ padding: "9px 10px", minWidth: 240 }}
                        >
                          <option value="">Choisir une expertise publiée…</option>
                          {available.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => addExpertise(row.person)}
                          disabled={!selection[row.person.id] || saving === row.person.id}
                          style={{ padding: "9px 12px", border: 0, borderRadius: 9, fontWeight: 700 }}
                        >
                          {saving === row.person.id ? "Ajout…" : "Valider l’expertise"}
                        </button>
                      </div>
                    ) : (
                      <div style={{ color: "#991b1b" }}>Bloqué : {row.blockedReason}</div>
                    )}
                  </div>
                </section>
              );
            })}
          </>
        ) : loading ? <div style={card}>Chargement de la matrice réseau…</div> : null}
      </div>
    </main>
  );
}
