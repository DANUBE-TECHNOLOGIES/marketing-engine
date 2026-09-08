"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 18 };
const headers = { accept: "application/json", "x-tenant-slug": "mondescale" };

export default function AgencyKnowledgeMatrixPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [selection, setSelection] = useState({});
  const [relationType, setRelationType] = useState({});
  const [bulkAgencyIds, setBulkAgencyIds] = useState([]);
  const [bulkTargetId, setBulkTargetId] = useState("");
  const [bulkRelationType, setBulkRelationType] = useState("recommends");
  const [bulkPreview, setBulkPreview] = useState(null);
  const [bulkApproved, setBulkApproved] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const response = await fetch("/api/knowledge/geo/network/agency-knowledge-matrix", { cache: "no-store", headers });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "Impossible de charger la matrice Agency Knowledge.");
      setData(payload?.data || null);
    } catch (e) { setError(e?.message || "Impossible de charger la matrice Agency Knowledge."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const targetById = useMemo(() => new Map((data?.targets || []).map((item) => [item.id, item])), [data]);
  const allAgencyIds = useMemo(() => (data?.agencies || []).map((row) => row.agency.id), [data]);

  function invalidateBulk() {
    setBulkPreview(null);
    setBulkApproved(false);
  }

  function toggleBulkAgency(id) {
    invalidateBulk();
    setBulkAgencyIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function addRelation(row) {
    const targetKnowledgeId = selection[row.agency.id];
    const type = relationType[row.agency.id] || "recommends";
    const target = targetById.get(targetKnowledgeId);
    if (!target) return;
    const confirmed = window.confirm(`Confirmer explicitement : ${row.agency.title} ${type === "features" ? "met en avant" : "recommande"} « ${target.title} » ?`);
    if (!confirmed) return;

    try {
      setSaving(row.agency.id); setError("");
      const response = await fetch("/api/knowledge/geo/network/agency-knowledge-links", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ agencyKnowledgeId: row.agency.id, targetKnowledgeId, relationType: type }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "Impossible d’ajouter la relation Agency Knowledge.");
      setSelection((current) => ({ ...current, [row.agency.id]: "" }));
      await load();
    } catch (e) { setError(e?.message || "Impossible d’ajouter la relation Agency Knowledge."); }
    finally { setSaving(""); }
  }

  async function prepareBulk() {
    try {
      setBulkBusy(true); setError(""); setBulkApproved(false); setBulkPreview(null);
      const response = await fetch("/api/knowledge/geo/network/agency-knowledge-bulk-preview", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          agencyKnowledgeIds: bulkAgencyIds,
          targetKnowledgeId: bulkTargetId,
          relationType: bulkRelationType,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "Impossible de préparer le bulk Agency Knowledge.");
      setBulkPreview(payload?.data || null);
    } catch (e) { setError(e?.message || "Impossible de préparer le bulk Agency Knowledge."); }
    finally { setBulkBusy(false); }
  }

  async function applyBulk() {
    if (!bulkPreview?.approvalToken || !bulkApproved) return;
    const target = targetById.get(bulkTargetId);
    const confirmed = window.confirm(`Appliquer explicitement « ${bulkRelationType} » vers « ${target?.title || bulkTargetId} » aux ${bulkAgencyIds.length} agences sélectionnées ?`);
    if (!confirmed) return;

    try {
      setBulkBusy(true); setError("");
      const response = await fetch("/api/knowledge/geo/network/agency-knowledge-bulk-apply", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          agencyKnowledgeIds: bulkAgencyIds,
          targetKnowledgeId: bulkTargetId,
          relationType: bulkRelationType,
          approvalToken: bulkPreview.approvalToken,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "Impossible d’appliquer le bulk Agency Knowledge.");
      setBulkPreview(null); setBulkApproved(false); setBulkTargetId(""); setBulkAgencyIds([]);
      await load();
    } catch (e) { setError(e?.message || "Impossible d’appliquer le bulk Agency Knowledge."); }
    finally { setBulkBusy(false); }
  }

  const summary = data?.summary || {};
  const bulkReport = bulkPreview?.report;
  return (
    <main style={{ minHeight: "100vh", padding: 32, background: "#f4f6f8", color: "#17202a" }}>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: "0 0 8px" }}>Destinations & thèmes — réseau</h1>
            <p style={{ margin: 0, color: "#64748b" }}>Relations Agency Knowledge explicites uniquement. Aucune suggestion issue des avis, du ranking, des contenus ou d’un LLM. Seules recommends et features peuvent être créées ici.</p>
          </div>
          <button type="button" onClick={load} disabled={loading} style={{ padding: "10px 16px", border: 0, borderRadius: 10, fontWeight: 700 }}>{loading ? "Actualisation…" : "Actualiser"}</button>
        </header>

        {error ? <div style={{ ...card, color: "#991b1b", borderColor: "#fecaca", marginBottom: 20 }}>{error}</div> : null}

        {data ? <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 22 }}>
            {[["Agences Knowledge", summary.agencyCount], ["Cibles publiées", summary.targetCount], ["Relations explicites", summary.explicitRelationCount]].map(([label, value]) => <div key={label} style={card}><div style={{ color: "#64748b", fontSize: 13 }}>{label}</div><strong style={{ display: "block", marginTop: 6, fontSize: 28 }}>{value ?? 0}</strong></div>)}
          </section>

          <section style={{ ...card, marginBottom: 22 }}>
            <h2 style={{ marginTop: 0 }}>Bulk réseau contrôlé</h2>
            <p style={{ color: "#64748b" }}>La sélection d’agences est obligatoire et explicite. « Sélectionner toutes » est une action humaine ; aucune sélection vide ne signifie automatiquement tout le réseau.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <button type="button" onClick={() => { invalidateBulk(); setBulkAgencyIds(allAgencyIds); }} disabled={!allAgencyIds.length}>Sélectionner toutes</button>
              <button type="button" onClick={() => { invalidateBulk(); setBulkAgencyIds([]); }} disabled={!bulkAgencyIds.length}>Effacer la sélection</button>
              <strong>{bulkAgencyIds.length} agence(s) sélectionnée(s)</strong>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 8, marginBottom: 14 }}>
              {(data.agencies || []).map((row) => <label key={row.agency.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={bulkAgencyIds.includes(row.agency.id)} onChange={() => toggleBulkAgency(row.agency.id)} />
                {row.agency.title}
              </label>)}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select value={bulkRelationType} onChange={(event) => { invalidateBulk(); setBulkRelationType(event.target.value); }} style={{ padding: "9px 10px" }}>
                <option value="recommends">recommends</option>
                <option value="features">features</option>
              </select>
              <select value={bulkTargetId} onChange={(event) => { invalidateBulk(); setBulkTargetId(event.target.value); }} style={{ padding: "9px 10px", minWidth: 300 }}>
                <option value="">Choisir une cible publiée…</option>
                {(data.targets || []).map((target) => <option key={target.id} value={target.id}>{target.type} · {target.title}</option>)}
              </select>
              <button type="button" onClick={prepareBulk} disabled={bulkBusy || !bulkAgencyIds.length || !bulkTargetId} style={{ padding: "9px 12px", fontWeight: 700 }}>{bulkBusy ? "Traitement…" : "Préparer le bulk"}</button>
            </div>

            {bulkReport ? <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
              <strong>Preview : {bulkReport.summary?.createCount ?? 0} création(s), {bulkReport.summary?.noopCount ?? 0} noop, sur {bulkReport.summary?.agencyCount ?? 0} agence(s).</strong>
              <div style={{ marginTop: 10 }}>{(bulkReport.agencies || []).map((agency) => <span key={agency.id} style={{ display: "inline-block", margin: "0 8px 8px 0", padding: "5px 9px", border: "1px solid #cbd5e1", borderRadius: 999 }}>{agency.action} · {agency.title}</span>)}</div>
              <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "10px 0" }}>
                <input type="checkbox" checked={bulkApproved} onChange={(event) => setBulkApproved(event.target.checked)} />
                J’approuve explicitement ce preview exact. Toute modification de la sélection, de la cible ou de la relation invalide cette approbation.
              </label>
              <button type="button" onClick={applyBulk} disabled={bulkBusy || !bulkApproved || !bulkPreview?.approvalToken} style={{ padding: "9px 12px", fontWeight: 700 }}>Appliquer le bulk approuvé</button>
            </div> : null}
          </section>

          {(data.agencies || []).map((row) => {
            const existing = new Set((row.relations || []).map((item) => `${item.relationType}:${item.target.id}`));
            const type = relationType[row.agency.id] || "recommends";
            const available = (data.targets || []).filter((target) => !existing.has(`${type}:${target.id}`));
            return <section key={row.agency.id} style={{ ...card, marginBottom: 16 }}>
              <h2 style={{ marginTop: 0 }}>{row.agency.title}</h2>
              <div style={{ marginBottom: 14 }}>{(row.relations || []).length ? row.relations.map((item) => <span key={`${item.relationType}:${item.target.id}`} style={{ display: "inline-block", margin: "0 8px 8px 0", padding: "5px 9px", border: "1px solid #cbd5e1", borderRadius: 999 }}>{item.relationType} · {item.target.title}</span>) : <span style={{ color: "#64748b" }}>Aucune relation explicite.</span>}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <select value={type} onChange={(event) => setRelationType((current) => ({ ...current, [row.agency.id]: event.target.value }))} style={{ padding: "9px 10px" }}>
                  <option value="recommends">recommends</option>
                  <option value="features">features</option>
                </select>
                <select value={selection[row.agency.id] || ""} onChange={(event) => setSelection((current) => ({ ...current, [row.agency.id]: event.target.value }))} style={{ padding: "9px 10px", minWidth: 280 }}>
                  <option value="">Choisir une cible publiée…</option>
                  {available.map((target) => <option key={target.id} value={target.id}>{target.type} · {target.title}</option>)}
                </select>
                <button type="button" onClick={() => addRelation(row)} disabled={!selection[row.agency.id] || saving === row.agency.id} style={{ padding: "9px 12px", border: 0, borderRadius: 9, fontWeight: 700 }}>{saving === row.agency.id ? "Ajout…" : "Valider la relation"}</button>
              </div>
            </section>;
          })}
        </> : loading ? <div style={card}>Chargement de la matrice réseau…</div> : null}
      </div>
    </main>
  );
}
