"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const ACTION_LABELS = {
  create_entity: "Créer l’entité",
  update_entity: "Mettre à jour l’entité",
  create_relation: "Créer la relation",
  noop_entity: "Entité déjà conforme",
  noop_relation: "Relation déjà conforme",
};

const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px",
    background: "#f4f6f8",
    color: "#17202a",
  },
  container: {
    maxWidth: "1080px",
    margin: "0 auto",
  },
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
    padding: "22px",
    marginBottom: "18px",
  },
  badge: {
    display: "inline-flex",
    padding: "5px 9px",
    borderRadius: "999px",
    background: "#e2e8f0",
    color: "#334155",
    fontWeight: 700,
    fontSize: "12px",
  },
  action: {
    padding: "14px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    marginBottom: "10px",
    background: "#f8fafc",
  },
  error: {
    padding: "12px 14px",
    borderRadius: "10px",
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    marginBottom: "18px",
  },
  success: {
    padding: "12px 14px",
    borderRadius: "10px",
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #bbf7d0",
    marginBottom: "18px",
  },
  button: {
    minHeight: "44px",
    padding: "10px 16px",
    border: 0,
    borderRadius: "10px",
    fontWeight: 800,
    cursor: "pointer",
  },
};

function actionTitle(action) {
  return ACTION_LABELS[action.action] || action.action;
}

function actionDescription(action) {
  if (action.action === "create_entity" || action.action === "update_entity") {
    return `${action.entity?.type || "entité"} · ${action.entity?.title || action.ref || "—"}`;
  }

  return `${action.sourceRef || "—"} → ${action.relationType || "—"} → ${action.targetRef || "—"}`;
}

export default function MaurepasKnowledgePilotPage() {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/knowledge/pilots/maurepas/preview",
        { cache: "no-store" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            "Impossible de calculer le plan Knowledge Maurepas."
        );
      }

      setPreview(result.data || null);
      setApproved(false);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const actions = preview?.plan?.actions || [];
  const actionableActions = useMemo(
    () => actions.filter((action) => !action.action?.startsWith("noop_")),
    [actions]
  );

  async function applyPlan() {
    if (!approved || !preview?.approvalToken || !actionableActions.length) {
      return;
    }

    const confirmed = window.confirm(
      `Appliquer ${actionableActions.length} action(s) au Knowledge Graph pour Maurepas ?`
    );

    if (!confirmed) {
      return;
    }

    setApplying(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "/api/knowledge/pilots/maurepas/apply",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            approvalToken: preview.approvalToken,
          }),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            "L’application du plan Knowledge a échoué."
        );
      }

      setSuccess(
        `Plan appliqué : ${result.data?.results?.length || 0} action(s) traitée(s).`
      );
      setApproved(false);
      await loadPreview();
    } catch (applyError) {
      setError(applyError.message);
    } finally {
      setApplying(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <Link
          href="/knowledge"
          style={{
            color: "#0f766e",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          ← Retour au Knowledge Studio
        </Link>

        <h1 style={{ marginBottom: "6px" }}>
          Pilote GEO · Maurepas
        </h1>
        <p style={{ color: "#64748b", lineHeight: 1.5 }}>
          Prévisualisez le plan calculé côté serveur avant toute écriture. Le navigateur ne transmet jamais le plan : uniquement son token d’approbation.
        </p>

        {error ? <div style={styles.error}>{error}</div> : null}
        {success ? <div style={styles.success}>{success}</div> : null}

        <section style={styles.card}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={styles.badge}>Manifest : {preview?.manifestKey || "—"}</span>
            <span style={styles.badge}>Mode : {preview?.plan?.mode || "—"}</span>
            <span style={styles.badge}>Writes planifiés : {preview?.plan?.writes ? "oui" : "non"}</span>
            <span style={styles.badge}>Destructif : {preview?.plan?.destructive ? "oui" : "non"}</span>
          </div>

          <button
            type="button"
            onClick={loadPreview}
            disabled={loading || applying}
            style={{
              ...styles.button,
              marginTop: "16px",
              background: "#e2e8f0",
              color: "#1e293b",
            }}
          >
            {loading ? "Calcul du plan…" : "Recalculer le plan"}
          </button>
        </section>

        <section style={styles.card}>
          <h2 style={{ marginTop: 0 }}>Plan de réconciliation</h2>

          {loading ? (
            <p>Chargement du dry-run…</p>
          ) : !actions.length ? (
            <p>Aucune action retournée par le planificateur.</p>
          ) : (
            actions.map((action, index) => (
              <article
                key={`${action.action}-${action.ref || action.sourceRef || index}`}
                style={styles.action}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <strong>{actionTitle(action)}</strong>
                  <span style={styles.badge}>{action.action}</span>
                </div>
                <div style={{ marginTop: "6px", color: "#475569" }}>
                  {actionDescription(action)}
                </div>
              </article>
            ))
          )}
        </section>

        <section style={styles.card}>
          <h2 style={{ marginTop: 0 }}>Approbation explicite</h2>

          {actionableActions.length === 0 && !loading ? (
            <div style={styles.success}>
              Le Knowledge Graph Maurepas est déjà réconcilié : aucune écriture n’est nécessaire.
            </div>
          ) : null}

          <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", lineHeight: 1.5 }}>
            <input
              type="checkbox"
              checked={approved}
              disabled={loading || applying || actionableActions.length === 0}
              onChange={(event) => setApproved(event.target.checked)}
            />
            <span>
              J’ai relu les actions ci-dessus et j’approuve l’application de ce plan exact. Toute modification du Knowledge Graph invalidera automatiquement cette approbation.
            </span>
          </label>

          <button
            type="button"
            onClick={applyPlan}
            disabled={!approved || loading || applying || actionableActions.length === 0}
            style={{
              ...styles.button,
              marginTop: "18px",
              background: "#0f766e",
              color: "#fff",
              opacity:
                !approved || loading || applying || actionableActions.length === 0
                  ? 0.5
                  : 1,
            }}
          >
            {applying ? "Application contrôlée…" : "Appliquer le plan approuvé"}
          </button>
        </section>
      </div>
    </main>
  );
}
