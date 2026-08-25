"use strict";

const crypto = require("node:crypto");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}
function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function blockType(block = {}) { return String(block.type || block.blockType || "").trim().toLowerCase(); }
function blockText(block = {}) {
  const content = block.content;
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((item) => blockText({ content: item })).join(" ");
  if (typeof content === "object") return Object.values(content).map((item) => blockText({ content: item })).join(" ");
  return String(content);
}
function hasExistingEngagementLink(page = {}) {
  const text = normalize((page.blocks || []).map(blockText).join(" "));
  return text.includes("/engagements") || text.includes("nos engagements") || text.includes("decouvrir nos engagements");
}
function scoreBlock(block = {}, index = 0) {
  const type = blockType(block);
  const text = normalize(blockText(block));
  let score = 0;
  if (type === "rich_text") score += 50;
  if (text.includes("service")) score += 25;
  if (text.includes("accompagn")) score += 15;
  if (text.includes("conseil")) score += 10;
  if (block?.seo?.generatedBy === "mse-25.40") score -= 35;
  if (type.includes("hero")) score -= 30;
  return { index, score, type, blockId: block.id || null, title: block?.content?.title || null };
}
function preferredBlock(page = {}) {
  return (page.blocks || [])
    .map(scoreBlock)
    .filter((row) => row.type === "rich_text" && row.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)[0] || null;
}

function buildInternalLinkProof(evidence = {}, currentPages = []) {
  if (evidence.readOnly !== true || evidence.writes !== false || evidence.policy?.automaticWrites !== false) {
    const error = new Error("Internal-link proof requires safe read-only evidence.");
    error.code = "MSE_25_47_LINK_PROOF_UNSAFE_SOURCE";
    throw error;
  }
  const pageMap = new Map(currentPages.map((row) => [`${row.siteSlug}:${row.pageSlug}`, row.page || row]));
  const items = [];
  for (const row of evidence.items || []) {
    const source = row.preferredSource;
    if (!source?.pageSlug) continue;
    const page = pageMap.get(`${row.siteSlug}:${source.pageSlug}`);
    if (!page) {
      items.push({ siteSlug: row.siteSlug, agencyId: row.agencyId, city: row.city, sourcePageSlug: source.pageSlug, targetPageSlug: row.targetPageSlug, proofComplete: false, reason: "source-page-snapshot-missing", automaticWrite: false });
      continue;
    }
    const duplicate = hasExistingEngagementLink(page);
    const block = preferredBlock(page);
    const proofComplete = !duplicate && Boolean(block);
    items.push({
      siteSlug: row.siteSlug,
      agencyId: row.agencyId,
      city: row.city,
      sourcePageSlug: source.pageSlug,
      targetPageSlug: row.targetPageSlug,
      targetHref: "/engagements",
      anchorText: "Découvrir nos engagements",
      sentence: "Découvrez également nos engagements pour un accompagnement clair et responsable tout au long de votre projet de voyage.",
      sourceSnapshotFingerprint: fingerprint(page),
      existingLinkDetected: duplicate,
      preferredBlock: block,
      proofComplete,
      decision: duplicate ? "already-linked" : proofComplete ? "sealed-link-candidate" : "manual-block-review",
      automaticWrite: false,
    });
  }
  const result = {
    type: "mse-25.47-internal-link-proof",
    sourceEvidenceFingerprint: evidence.evidenceFingerprint,
    readOnly: true,
    writes: false,
    destructive: false,
    policy: {
      exactLinkProofOnly: true,
      richTextSourceRequired: true,
      antiDuplicationRequired: true,
      sourceSnapshotRequired: true,
      noAutomaticInternalLinks: true,
      automaticWrites: false,
    },
    items,
    summary: {
      targetCount: items.length,
      proofCompleteCount: items.filter((row) => row.proofComplete).length,
      alreadyLinkedCount: items.filter((row) => row.existingLinkDetected).length,
      manualBlockReviewCount: items.filter((row) => row.decision === "manual-block-review").length,
      sealedLinkCandidateCount: items.filter((row) => row.decision === "sealed-link-candidate").length,
      automaticWriteCount: 0,
    },
  };
  return { ...result, linkProofFingerprint: fingerprint(result) };
}

module.exports = { buildInternalLinkProof, fingerprint, hasExistingEngagementLink, preferredBlock, scoreBlock };
