"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchPageUniqueness,
  fetchSite,
} from "../../lib/page-builder-v2/page-builder-api";

function scoreTone(score) {
  if (score >= 70) return { label: "Bon niveau", color: "#166534", background: "#dcfce7", border: "#86efac" };
  if (score >= 60) return { label: "À renforcer", color: "#92400e", background: "#fef3c7", border: "#fcd34d" };
  if (score >= 50) return { label: "Différenciation faible", color: "#9a3412", background: "#ffedd5", border: "#fdba74" };
  return { label: "Priorité SEO", color: "#991b1b", background: "#fee2e2", border: "#fca5a5" };
}

function percent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

export default function NetworkUniquenessAudit({ siteId, pageSlug, refreshKey = "" }) {
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!siteId || !pageSlug) {
        setAudit(null);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const site = await fetchSite(siteId);
        const page = site.pages.find(
          (item) => String(item.slug || "") === String(pageSlug || "")
        );
        if (!page) throw new Error(`Page /${pageSlug} introuvable dans le mini-site.`);
        const result = await fetchPageUniqueness(site, page);
        if (!cancelled) setAudit(result);
      } catch (loadError) {
        if (!cancelled) {
          setAudit(null);
          setError(loadError?.message || "Audit d’unicité indisponible.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [siteId, pageSlug, refreshKey]);

  const flagged = useMemo(
    () => (Array.isArray(audit?.blockInsights) ? audit.blockInsights : []),
    [audit]
  );

  if (!siteId || !pageSlug) return null;

  const tone = scoreTone(Number(audit?.score || 0));

  return (
    <section
      data-network-uniqueness-audit="true"
      style={{
        marginTop: 14,
        padding: 12,
        borderRadius: 10,
        background: "white",
        border: `1px solid ${audit ? tone.border : "#cbd5e1"}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <strong style={{ display: "block" }}>Différenciation réseau</strong>
          <span style={{ fontSize: 11, color: "#64748b" }}>Comparaison éditoriale avec les autres agences uniquement</span>
        </div>
        <div
          style={{
            minWidth: 72,
            textAlign: "center",
            borderRadius: 999,
            padding: "6px 9px",
            fontWeight: 900,
            fontSize: 12,
            color: audit ? tone.color : "#64748b",
            background: audit ? tone.background : "#f1f5f9",
          }}
        >
          {loading ? "…" : audit ? `${audit.score}/100` : "—"}
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 9, fontSize: 11, color: "#991b1b" }}>{error}</div>
      ) : null}

      {audit ? (
        <>
          <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: tone.color }}>{tone.label}</div>
          <div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.45, color: "#475569" }}>
            Similarité inter-agences max. {percent(audit.highestSimilarity)} · {audit.metrics?.blocksFlagged || 0} bloc(s) à différencier · {audit.metrics?.networkCandidatesObserved || 0} page(s) réseau observée(s)
          </div>
          <div style={{ marginTop: 5, fontSize: 11, lineHeight: 1.45, color: "#64748b" }}>{audit.note}</div>

          {flagged.length ? (
            <>
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                style={{
                  marginTop: 10,
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  background: "#f8fafc",
                  color: "#334155",
                  padding: "6px 9px",
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {expanded ? "Masquer les blocs" : `Afficher les ${flagged.length} bloc(s)`}
              </button>

              {expanded ? (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {flagged.slice(0, 8).map((block) => {
                    const blockTone = scoreTone(Number(block.score || 0));
                    const nearest = block.nearestMatches?.[0];
                    const advice = block.recommendations?.[0];
                    return (
                      <article
                        key={block.blockId || `${block.blockType}-${block.displayOrder}`}
                        data-uniqueness-block-id={block.blockId || ""}
                        style={{
                          border: `1px solid ${blockTone.border}`,
                          borderRadius: 9,
                          padding: 9,
                          background: "#fff",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <strong style={{ fontSize: 12 }}>{block.blockName || block.blockType}</strong>
                          <span style={{ fontSize: 11, fontWeight: 900, color: blockTone.color }}>{block.score}/100</span>
                        </div>
                        {nearest ? (
                          <div style={{ marginTop: 4, fontSize: 10.5, color: "#64748b" }}>
                            Plus proche : <strong>{nearest.agencyName}</strong> · {percent(nearest.similarity)}
                          </div>
                        ) : null}
                        {block.sharedSegments?.[0] ? (
                          <div style={{ marginTop: 6, padding: "6px 7px", borderRadius: 6, background: "#f8fafc", fontSize: 10.5, lineHeight: 1.4, color: "#475569" }}>
                            « {block.sharedSegments[0]} »
                          </div>
                        ) : null}
                        {advice ? (
                          <div style={{ marginTop: 6, fontSize: 10.5, lineHeight: 1.4, color: "#334155" }}>
                            <strong>{advice.title}</strong> — {advice.detail}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </>
          ) : (
            <div style={{ marginTop: 9, fontSize: 11, color: "#166534", fontWeight: 700 }}>
              Aucun bloc éditorial inter-agences préoccupant.
            </div>
          )}

          {audit.internalRepetition?.length ? (
            <details style={{ marginTop: 10, fontSize: 10.5, color: "#64748b" }}>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                {audit.internalRepetition.length} répétition(s) interne(s) observée(s), hors score réseau
              </summary>
              <div style={{ marginTop: 5, lineHeight: 1.45 }}>
                Ces répétitions appartiennent au même mini-site et ne sont pas traitées comme une duplication entre agences.
              </div>
            </details>
          ) : null}
        </>
      ) : !loading && !error ? (
        <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>Audit réseau en attente.</div>
      ) : null}
    </section>
  );
}
