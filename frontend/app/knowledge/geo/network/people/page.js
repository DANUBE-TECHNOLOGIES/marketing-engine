"use client";

import { useCallback, useEffect, useState } from "react";

const card = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 18,
};

const requestHeaders = {
  accept: "application/json",
  "x-tenant-slug": "mondescale",
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
  const [applyPreview, setApplyPreview] = useState(null);
  const [approved, setApproved] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/knowledge/geo/network/people-report", {
        cache: "no-store",
        headers: requestHeaders,
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

  async function prepareApply() {
    try {
      setPreparing(true);
      setError("");
      setApplyResult(null);
      setApproved(false);

      const response = await fetch("/api/knowledge/geo/network/people-apply-preview", {
        cache: "no-store",
        headers: requestHeaders,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message || "Impossible de préparer l’application Person réseau.");
      }
      setApplyPreview(payload?.data || null);
    } catch (prepareError) {
      setError(prepareError?.message || "Impossible de préparer l’application Person réseau.");
    } finally {
      setPreparing(false);
    }
  }

  async function applyPeople() {
    if (!approved || !applyPreview?.approvalToken) return;

    const summary = applyPreview?.report?.summary || {};
    const confirmed = window.confirm(
      `Appliquer ${summary.createPersonCount ?? 0} création(s) Person et ${summary.createWorksAtCount ?? 0} relation(s) works_at manquante(s) ? Les cas ambigus resteront inchangés.`
    );
    if (!confirmed) return;

    try {
      setApplying(true);
      setError("");
      setApplyResult(null);

      const response = await fetch("/api/knowledge/geo/network/apply-people", {
        method: "POST",
        headers: {
          ...requestHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          approvalToken: applyPreview.approvalToken,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message || "L’application Person réseau a échoué.");
      }

      setApplyResult(payload?.data || null);
      setApplyPreview(null);
      setApproved(false);
      await load();
    } catch (applyError) {
      setError(applyError?.message || "L’application Person réseau a échoué.");
    } finally {
      setApplying(false);
    }
  }

  const summary = data?.summary || {};
  const previewSummary = applyPreview?.report?.summary || {};

  return (
    <main style={{ minHeight: "100vh", padding: 32, background: "#f4f6f8", color: "#17202a" }}>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <a href="/knowledge/geo/network">← GEO réseau</a>
            <h1 style={{ margin: "12px 0 6px" }}>Réconciliation conseillers — réseau</h1>
            <p style={{ margin: 0, color: "#64748b" }}>
              Analyse de tous les blocs équipe publiés. L’application contrôlée ne traite que les Person non ambiguës et les relations works_at ; aucune expertise n’est générée.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={load} disabled={loading || applying} style={{ padding: "10px 16px", border: 0, borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
              {loading ? "Actualisation…" : "Actualiser"}
            </button>
            <button type="button" onClick={prepareApply} disabled={preparing || applying || !data} style={{ padding: "10px 16px", border: 0, borderRadius: 10, fontWeight: 700, cursor: "pointer", background: "#0f766e", color: "#fff" }}>
              {preparing ? "Préparation…" : "Préparer l’application Person"}
            </button>
          </div>
        </header>

        {error ? <div style={{ ...card, color: "#991b1b", borderColor: "#fecaca", marginBottom: 20 }}>{error}</div> : null}

        {applyResult ? (
          <div style={{ ...card, color: "#166534", borderColor: "#bbf7d0", marginBottom: 20 }}>
            Application terminée : {applyResult.appliedCount ?? 0} modification(s), {applyResult.noopCount ?? 0} déjà conforme(s). Les cas bloqués sont restés inchangés.
          </div>
        ) : null}

        {applyPreview ? (
          <section style={{ ...card, borderColor: "#f59e0b", marginBottom: 22 }}>
            <h2 style={{ marginTop: 0 }}>Approbation réseau Person</h2>
            <p>
              Le serveur a recalculé le réseau : <strong>{previewSummary.eligibleCount ?? 0} profil(s) éligible(s)</strong>, dont <strong>{previewSummary.createPersonCount ?? 0} création(s) Person</strong> et <strong>{previewSummary.createWorksAtCount ?? 0} relation(s) works_at</strong>. <strong>{previewSummary.blockedCount ?? 0} cas bloqué(s)</strong> resteront inchangés.
            </p>
            <p style={{ color: "#64748b" }}>
              Le batch effectue un préflight complet avant la première écriture. Il ne crée ni expertise, ni relation expert_in, ne modifie aucun cas ambigu et n’accepte aucun plan envoyé par le navigateur.
            </p>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "16px 0" }}>
              <input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} />
              <span>J’approuve explicitement l’application des seules Person non ambiguës et de leurs relations <strong>works_at</strong> correspondant à ce rapport réseau.</span>
            </label>
            <button type="button" disabled={!approved || applying} onClick={applyPeople} style={{ padding: "10px 16px", border: 0, borderRadius: 10, fontWeight: 700, cursor: approved ? "pointer" : "not-allowed", background: "#991b1b", color: "#fff" }}>
              {applying ? "Application…" : "Appliquer Person + works_at"}
            </button>
          </section>
        ) : null}

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
