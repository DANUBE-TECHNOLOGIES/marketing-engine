"use client";

import { useCallback, useEffect, useState } from "react";

const box = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 18,
};

const requestHeaders = {
  accept: "application/json",
  "x-tenant-slug": "mondescale",
};

export default function NetworkGeoPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applyPreview, setApplyPreview] = useState(null);
  const [approved, setApproved] = useState(false);
  const [preparingApply, setPreparingApply] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/knowledge/geo/network/report", {
        cache: "no-store",
        headers: requestHeaders,
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

  async function prepareApply() {
    try {
      setPreparingApply(true);
      setError("");
      setApplyResult(null);
      setApproved(false);

      const response = await fetch("/api/knowledge/geo/network/apply-preview", {
        cache: "no-store",
        headers: requestHeaders,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message || "Impossible de préparer l’application réseau.");
      }
      setApplyPreview(payload?.data || null);
    } catch (prepareError) {
      setError(prepareError?.message || "Impossible de préparer l’application réseau.");
    } finally {
      setPreparingApply(false);
    }
  }

  async function applyAgencies() {
    if (!approved || !applyPreview?.approvalToken) return;

    const eligible = applyPreview?.report?.summary?.eligibleAgencyCount ?? 0;
    const actionable = applyPreview?.report?.summary?.actionable ?? 0;
    const confirmed = window.confirm(
      `Appliquer le plan GEO Agency sur ${eligible} agence(s), dont ${actionable} action(s) nécessaire(s) ?`
    );

    if (!confirmed) return;

    try {
      setApplying(true);
      setError("");
      setApplyResult(null);

      const response = await fetch("/api/knowledge/geo/network/apply-agencies", {
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
        throw new Error(payload?.error?.message || "L’application GEO réseau a échoué.");
      }

      setApplyResult(payload?.data || null);
      setApplyPreview(null);
      setApproved(false);
      await load();
    } catch (applyError) {
      setError(applyError?.message || "L’application GEO réseau a échoué.");
    } finally {
      setApplying(false);
    }
  }

  const summary = data?.summary || {};
  const previewSummary = applyPreview?.report?.summary || {};

  return (
    <main style={{ minHeight: "100vh", padding: 32, background: "#f4f6f8", color: "#17202a" }}>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 24 }}>
          <div>
            <a href="/knowledge">← Knowledge Studio</a>
            <h1 style={{ margin: "12px 0 6px" }}>GEO réseau Mondescale</h1>
            <p style={{ margin: 0, color: "#64748b" }}>
              Diagnostic réseau en lecture seule, avec application contrôlée limitée aux entités Agency.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={load} disabled={loading || applying} style={{ padding: "10px 16px", borderRadius: 10, border: 0, cursor: "pointer", fontWeight: 700 }}>
              {loading ? "Actualisation…" : "Actualiser"}
            </button>
            <button type="button" onClick={prepareApply} disabled={preparingApply || applying || !data} style={{ padding: "10px 16px", borderRadius: 10, border: 0, cursor: "pointer", fontWeight: 700, background: "#0f766e", color: "#fff" }}>
              {preparingApply ? "Préparation…" : "Préparer l’application Agency"}
            </button>
          </div>
        </div>

        {error ? <div style={{ ...box, borderColor: "#fecaca", color: "#991b1b", marginBottom: 20 }}>{error}</div> : null}

        {applyResult ? (
          <div style={{ ...box, borderColor: "#bbf7d0", color: "#166534", marginBottom: 20 }}>
            Application terminée sur {applyResult.appliedAgencyCount ?? 0} agence(s). Les agences bloquées sont restées inchangées.
          </div>
        ) : null}

        {applyPreview ? (
          <section style={{ ...box, borderColor: "#f59e0b", marginBottom: 22 }}>
            <h2 style={{ marginTop: 0 }}>Approbation réseau Agency</h2>
            <p>
              Le serveur vient de recalculer le plan complet : <strong>{previewSummary.eligibleAgencyCount ?? 0} agence(s) éligible(s)</strong>, <strong>{previewSummary.actionable ?? 0} action(s)</strong>, <strong>{previewSummary.blockedAgencyCount ?? 0} bloquée(s)</strong> laissée(s) inchangée(s).
            </p>
            <p style={{ color: "#64748b" }}>
              Cette opération ne crée ni conseiller, ni expertise, ni relation. Le token ci-dessous est lié exactement à ce rapport et devient invalide si le réseau change.
            </p>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "16px 0" }}>
              <input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} />
              <span>J’approuve explicitement l’application des seules entités Knowledge <strong>Agency</strong> correspondant à ce rapport réseau.</span>
            </label>
            <button type="button" disabled={!approved || applying} onClick={applyAgencies} style={{ padding: "10px 16px", borderRadius: 10, border: 0, cursor: approved ? "pointer" : "not-allowed", fontWeight: 700, background: "#991b1b", color: "#fff" }}>
              {applying ? "Application…" : "Appliquer les entités Agency"}
            </button>
          </section>
        ) : null}

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
