"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPageUniqueness, fetchSite } from "../../lib/page-builder-v2/page-builder-api";
import { fetchDraftUniqueness, proposeLocalRewrite } from "../../lib/page-builder-v2/local-rewrite-api";
import { readLocalDraft } from "../../lib/page-builder-v2/draft-storage";

function scoreTone(score) {
  if (score >= 70) return { label: "Bon niveau", color: "#166534", background: "#dcfce7", border: "#86efac" };
  if (score >= 60) return { label: "À renforcer", color: "#92400e", background: "#fef3c7", border: "#fcd34d" };
  if (score >= 50) return { label: "Différenciation faible", color: "#9a3412", background: "#ffedd5", border: "#fdba74" };
  return { label: "Priorité SEO", color: "#991b1b", background: "#fee2e2", border: "#fca5a5" };
}

function percent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fieldLabel(field) {
  return {
    html: "Contenu",
    text: "Texte",
    subtitle: "Sous-titre",
    introduction: "Introduction",
  }[field] || "";
}

function applyThroughExistingEditor(proposal) {
  if (typeof document === "undefined" || !proposal?.field) return false;
  const auditNode = document.querySelector('[data-network-uniqueness-audit="true"]');
  const panel = auditNode?.closest("aside") || document;
  const expected = fieldLabel(proposal.field);
  if (!expected) return false;

  const label = Array.from(panel.querySelectorAll("label")).find((node) => {
    const heading = node.querySelector(":scope > span");
    return String(heading?.textContent || "").trim() === expected;
  });
  const input = label?.querySelector("textarea, input");
  if (!input) return false;

  const prototype = input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (!setter) return false;

  setter.call(input, String(proposal.after || ""));
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.focus();
  return true;
}

function BlockAuditCard({ block, focused = false }) {
  if (!block) return null;
  const tone = scoreTone(Number(block.score || 0));
  const nearest = block.nearestMatches?.[0];
  const advice = block.recommendations?.[0];
  return (
    <article data-uniqueness-block-id={block.blockId || ""} data-uniqueness-focused={focused ? "true" : "false"} style={{ border: `1px solid ${tone.border}`, borderRadius: 9, padding: 9, background: focused ? tone.background : "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <strong style={{ fontSize: 12 }}>{block.blockName || block.blockType}</strong>
        <span style={{ fontSize: 11, fontWeight: 900, color: tone.color }}>{block.score}/100</span>
      </div>
      <div style={{ marginTop: 3, fontSize: 10.5, fontWeight: 800, color: tone.color }}>{tone.label}</div>
      {nearest ? <div style={{ marginTop: 4, fontSize: 10.5, color: "#64748b" }}>Plus proche : <strong>{nearest.agencyName}</strong> · {percent(nearest.similarity)}</div> : null}
      {block.sharedSegments?.length ? <div style={{ marginTop: 6, display: "grid", gap: 4 }}>{block.sharedSegments.slice(0, focused ? 3 : 1).map((segment) => <div key={segment} style={{ padding: "6px 7px", borderRadius: 6, background: "#f8fafc", fontSize: 10.5, lineHeight: 1.4, color: "#475569" }}>« {segment} »</div>)}</div> : null}
      {advice ? <div style={{ marginTop: 6, fontSize: 10.5, lineHeight: 1.4, color: "#334155" }}><strong>{advice.title}</strong> — {advice.detail}</div> : null}
    </article>
  );
}

function LocalEvidence({ evidence }) {
  const items = Array.isArray(evidence?.evidence) ? evidence.evidence : [];
  if (!evidence) return null;
  return (
    <details data-local-evidence="true" style={{ marginTop: 10, borderTop: "1px solid #e2e8f0", paddingTop: 9 }} open>
      <summary style={{ cursor: "pointer", fontWeight: 900, fontSize: 10.5, color: "#334155" }}>Preuves locales disponibles</summary>
      {items.length ? (
        <div style={{ marginTop: 7, display: "grid", gap: 6 }}>
          {items.slice(0, 7).map((item) => (
            <div key={item.code} style={{ padding: "7px 8px", borderRadius: 7, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: "#475569" }}>{item.label}</div>
              <div style={{ marginTop: 2, fontSize: 10.5, lineHeight: 1.4, color: "#0f172a" }}>{item.value}</div>
              <div style={{ marginTop: 2, fontSize: 9.5, color: "#94a3b8" }}>Source : {item.source}</div>
            </div>
          ))}
        </div>
      ) : <div style={{ marginTop: 6, fontSize: 10.5, color: "#92400e" }}>Aucune preuve locale structurée suffisante.</div>}
      <div style={{ marginTop: 7, fontSize: 10, lineHeight: 1.4, color: "#64748b" }}>{evidence.guidance}</div>
    </details>
  );
}

function RewriteAssistant({ insight, proposal, loading, error, applied, onPropose, onApply }) {
  if (!insight) return null;
  return (
    <div data-local-rewrite-assistant="true" style={{ marginTop: 9, padding: 9, borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff" }}>
      <div style={{ fontSize: 10.5, fontWeight: 900, color: "#334155" }}>Assistance à la réécriture locale</div>
      <div style={{ marginTop: 4, fontSize: 10, lineHeight: 1.4, color: "#64748b" }}>La proposition utilise uniquement les preuves locales vérifiées. Rien n’est remplacé sans votre validation.</div>
      {!proposal ? (
        <button type="button" disabled={loading} onClick={onPropose} style={{ marginTop: 8, border: "1px solid #94a3b8", borderRadius: 7, background: "#f8fafc", padding: "6px 8px", cursor: loading ? "default" : "pointer", fontSize: 10.5, fontWeight: 900, color: "#334155" }}>
          {loading ? "Préparation…" : "Proposer une version locale"}
        </button>
      ) : proposal.eligible ? (
        <div style={{ marginTop: 8, display: "grid", gap: 7 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 10, fontWeight: 900 }}>
            <span style={{ color: "#991b1b" }}>{percent(proposal.currentSimilarity)} avant</span>
            <span style={{ color: "#166534" }}>→ {percent(proposal.projectedSimilarity)} projeté</span>
          </div>
          <div style={{ padding: 8, borderRadius: 7, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 9.5, fontWeight: 900, color: "#64748b", textTransform: "uppercase" }}>Proposition · {fieldLabel(proposal.field)}</div>
            <div style={{ marginTop: 5, fontSize: 10.5, lineHeight: 1.45, color: "#0f172a" }}>{String(proposal.after || "").replace(/<[^>]*>/g, " ")}</div>
          </div>
          {proposal.evidence?.length ? <div style={{ fontSize: 9.5, lineHeight: 1.4, color: "#64748b" }}>Preuves utilisées : {proposal.evidence.map((item) => item.label).join(", ")}.</div> : null}
          <button type="button" disabled={applied} onClick={() => onApply(proposal)} style={{ border: "1px solid #166534", borderRadius: 7, background: applied ? "#f0fdf4" : "#dcfce7", color: "#166534", padding: "7px 9px", cursor: applied ? "default" : "pointer", fontSize: 10.5, fontWeight: 900 }}>{applied ? "Appliqué au brouillon · audit relancé" : "Appliquer volontairement au bloc"}</button>
        </div>
      ) : (
        <div style={{ marginTop: 7, fontSize: 10.5, color: "#92400e" }}>Aucune proposition sûre n’est disponible pour ce bloc ({proposal.reason}).</div>
      )}
      {error ? <div style={{ marginTop: 6, fontSize: 10, color: "#991b1b" }}>{error}</div> : null}
    </div>
  );
}

export default function NetworkUniquenessAudit({ siteId, pageSlug, selectedBlockId = "", refreshKey = "", compact = false }) {
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(!compact);
  const [resolvedSite, setResolvedSite] = useState(null);
  const [resolvedPage, setResolvedPage] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [rewriteError, setRewriteError] = useState("");
  const [applied, setApplied] = useState(false);
  const [selfRefreshKey, setSelfRefreshKey] = useState(0);

  useEffect(() => {
    setProposal(null);
    setRewriteError("");
    setApplied(false);
  }, [selectedBlockId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!siteId || !pageSlug) { setAudit(null); return; }
      setLoading(true); setError("");
      try {
        const currentSite = await fetchSite(siteId);
        const persistedPage = currentSite.pages.find((item) => String(item.slug || "") === String(pageSlug || ""));
        if (!persistedPage) throw new Error(`Page /${pageSlug} introuvable dans le mini-site.`);
        const localDraft = readLocalDraft(currentSite.id, persistedPage.id)?.page || null;
        const result = localDraft ? await fetchDraftUniqueness(currentSite, localDraft) : await fetchPageUniqueness(currentSite, persistedPage);
        if (!cancelled) {
          setResolvedSite(currentSite);
          setResolvedPage(persistedPage);
          setAudit(result);
          setProposal(null);
          setApplied(false);
        }
      } catch (loadError) {
        if (!cancelled) { setAudit(null); setError(loadError?.message || "Audit d’unicité indisponible."); }
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [siteId, pageSlug, refreshKey, selfRefreshKey]);

  const flagged = useMemo(() => Array.isArray(audit?.blockInsights) ? audit.blockInsights : [], [audit]);
  const selectedInsight = useMemo(() => flagged.find((block) => String(block.blockId || "") === String(selectedBlockId || "")) || null, [flagged, selectedBlockId]);

  async function requestRewrite() {
    if (!resolvedSite || !resolvedPage || !selectedBlockId) return;
    setRewriteLoading(true); setRewriteError(""); setProposal(null); setApplied(false);
    try {
      await sleep(850);
      const currentPage = readLocalDraft(resolvedSite.id, resolvedPage.id)?.page || resolvedPage;
      setProposal(await proposeLocalRewrite(resolvedSite, currentPage, selectedBlockId));
    } catch (rewriteFailure) {
      setRewriteError(rewriteFailure?.message || "Proposition locale indisponible.");
    } finally {
      setRewriteLoading(false);
    }
  }

  function applyRewrite(nextProposal) {
    const changed = applyThroughExistingEditor(nextProposal);
    if (!changed) {
      setRewriteError("Le champ éditorial correspondant n’a pas pu être retrouvé dans le Designer. Aucune modification n’a été appliquée.");
      return;
    }
    setApplied(true);
    setRewriteError("");
    setTimeout(() => setSelfRefreshKey((value) => value + 1), 950);
  }

  if (!siteId || !pageSlug) return null;
  const tone = scoreTone(Number(audit?.score || 0));

  return (
    <section data-network-uniqueness-audit="true" data-network-uniqueness-version={audit?.version || ""} style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "white", border: `1px solid ${audit ? tone.border : "#cbd5e1"}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div><strong style={{ display: "block" }}>Différenciation réseau</strong><span style={{ fontSize: 11, color: "#64748b" }}>Comparaison avec les autres agences Mondescale</span></div>
        <div style={{ minWidth: 72, textAlign: "center", borderRadius: 999, padding: "6px 9px", fontWeight: 900, fontSize: 12, color: audit ? tone.color : "#64748b", background: audit ? tone.background : "#f1f5f9" }}>{loading ? "…" : audit ? `${audit.score}/100` : "—"}</div>
      </div>
      {error ? <div style={{ marginTop: 9, fontSize: 11, color: "#991b1b" }}>{error}</div> : null}
      {audit ? <>
        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: tone.color }}>{tone.label}</div>
        <div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.45, color: "#475569" }}>Similarité inter-agences max. {percent(audit.highestSimilarity)} · {audit.metrics?.blocksFlagged || 0} bloc(s) à différencier{audit.draft ? " · brouillon courant" : ""}</div>
        {selectedBlockId ? <div style={{ marginTop: 10 }} data-selected-block-uniqueness="true"><div style={{ marginBottom: 6, fontSize: 10.5, fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: ".04em" }}>Bloc sélectionné</div>{selectedInsight ? <><BlockAuditCard block={selectedInsight} focused /><RewriteAssistant insight={selectedInsight} proposal={proposal} loading={rewriteLoading} error={rewriteError} applied={applied} onPropose={requestRewrite} onApply={applyRewrite} /></> : <div style={{ padding: 8, borderRadius: 8, background: "#f0fdf4", color: "#166534", fontSize: 10.5, lineHeight: 1.4, fontWeight: 700 }}>Aucun signal de duplication inter-agences notable pour ce bloc.</div>}</div> : null}
        <LocalEvidence evidence={audit.localEvidence} />
        {!compact && flagged.length ? <><button type="button" onClick={() => setExpanded((value) => !value)} style={{ marginTop: 10, border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc", color: "#334155", padding: "6px 9px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>{expanded ? "Masquer les autres blocs" : `Afficher les ${flagged.length} bloc(s)`}</button>{expanded ? <div style={{ marginTop: 10, display: "grid", gap: 8 }}>{flagged.filter((block) => block.blockId !== selectedBlockId).slice(0, 8).map((block) => <BlockAuditCard key={block.blockId || `${block.blockType}-${block.displayOrder}`} block={block} />)}</div> : null}</> : null}
        {audit.internalRepetition?.length ? <details style={{ marginTop: 10, fontSize: 10.5, color: "#64748b" }}><summary style={{ cursor: "pointer", fontWeight: 700 }}>{audit.internalRepetition.length} répétition(s) interne(s), hors score réseau</summary><div style={{ marginTop: 5, lineHeight: 1.45 }}>Elles appartiennent au même mini-site et ne sont pas traitées comme une duplication entre agences.</div></details> : null}
      </> : !loading && !error ? <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>Audit réseau en attente.</div> : null}
    </section>
  );
}
