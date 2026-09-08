"use client";

import { useState } from "react";

const card = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 18,
};

export default function NetworkTeamBacklinksPage() {
  const [preview, setPreview] = useState(null);
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function prepare() {
    try {
      setLoading(true);
      setError("");
      setResult(null);
      setApproved(false);
      const response = await fetch("/api/knowledge/geo/network/team-backlink-preview", {
        cache: "no-store",
        headers: { accept: "application/json", "x-tenant-slug": "mondescale" },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "Impossible de préparer les backlinks équipe.");
      setPreview(payload?.data || null);
    } catch (err) {
      setError(err?.message || "Impossible de préparer les backlinks équipe.");
    } finally {
      setLoading(false);
    }
  }

  async function applyBacklinks() {
    if (!approved || !preview?.approvalToken) return;
    const count = preview?.report?.summary?.patchCount ?? 0;
    if (!window.confirm(`Écrire ${count} liaison(s) knowledgeEntityId validée(s) dans les blocs équipe ?`)) return;

    try {
      setApplying(true);
      setError("");
      const response = await fetch("/api/knowledge/geo/network/apply-team-backlinks", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-tenant-slug": "mondescale",
        },
        body: JSON.stringify({ approvalToken: preview.approvalToken }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "L’application des backlinks équipe a échoué.");
      setResult(payload?.data || null);
      setPreview(null);
      setApproved(false);
    } catch (err) {
      setError(err?.message || "L’application des backlinks équipe a échoué.");
    } finally {
      setApplying(false);
    }
  }

  const summary = preview?.report?.summary || {};

  return (
    <main style={{ minHeight: "100vh", padding: 32, background: "#f4f6f8", color: "#17202a" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <a href="/knowledge/geo/network/people">← Conseillers réseau</a>
        <h1>Backlinks Knowledge → équipes</h1>
        <p style={{ color: "#64748b" }}>
          Écrit uniquement les knowledgeEntityId de Person canoniques déjà validées dans les blocs équipe publiés. Aucun autre champ n’est modifié.
        </p>

        <button type="button" onClick={prepare} disabled={loading || applying} style={{ padding: "10px 16px", border: 0, borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
          {loading ? "Préparation…" : "Préparer le backlink réseau"}
        </button>

        {error ? <div style={{ ...card, color: "#991b1b", borderColor: "#fecaca", marginTop: 18 }}>{error}</div> : null}
        {result ? <div style={{ ...card, color: "#166534", borderColor: "#bbf7d0", marginTop: 18 }}>{result.patchedCount ?? 0} bloc(s) équipe mis à jour.</div> : null}

        {preview ? (
          <section style={{ ...card, marginTop: 20, borderColor: "#f59e0b" }}>
            <h2 style={{ marginTop: 0 }}>Approbation backlink réseau</h2>
            <p>
              <strong>{summary.patchCount ?? 0}</strong> liaison(s) à écrire · <strong>{summary.noopCount ?? 0}</strong> déjà liée(s) · <strong>{summary.blockedCount ?? 0}</strong> bloquée(s).
            </p>
            <p style={{ color: "#64748b" }}>
              Le serveur effectue un préflight complet. Les cas ambigus ou non canoniques restent inchangés. Le patch conserve tous les champs existants du membre et du bloc.
            </p>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "16px 0" }}>
              <input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} />
              <span>J’approuve explicitement l’écriture des seuls <strong>knowledgeEntityId</strong> correspondant à ce rapport.</span>
            </label>
            <button type="button" onClick={applyBacklinks} disabled={!approved || applying} style={{ padding: "10px 16px", border: 0, borderRadius: 10, fontWeight: 700, background: "#991b1b", color: "#fff", cursor: approved ? "pointer" : "not-allowed" }}>
              {applying ? "Application…" : "Appliquer les backlinks équipe"}
            </button>
          </section>
        ) : null}
      </div>
    </main>
  );
}
