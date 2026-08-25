"use strict";

const crypto = require("node:crypto");
const { saveBody, validatedSaveBody } = require("../minisite-seo-enrichment/quality-uplift-write-intent");

function stable(value) { if (Array.isArray(value)) return value.map(stable); if (!value || typeof value !== "object") return value; return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])); }
function digest(value) { return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex"); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function error(code, message, details = {}) { const e = new Error(message); e.code = code; e.status = 409; e.details = details; return e; }
function blockType(block = {}) { return String(block.type || block.blockType || "").trim().toLowerCase(); }

function appendContextualLink(page, proof) {
  const blocks = Array.isArray(page.blocks) ? page.blocks : [];
  const index = Number(proof?.preferredBlock?.index);
  if (!Number.isInteger(index) || index < 0 || index >= blocks.length) throw error("MSE_25_47_LINK_BLOCK_MISSING", "Le bloc source scellé n'existe plus.", { siteSlug: proof.siteSlug, pageSlug: proof.sourcePageSlug });
  const block = blocks[index];
  if (blockType(block) !== String(proof.preferredBlock.type || "").toLowerCase()) throw error("MSE_25_47_LINK_BLOCK_CHANGED", "Le type du bloc source a changé.", { siteSlug: proof.siteSlug, pageSlug: proof.sourcePageSlug, index });
  const content = block.content && typeof block.content === "object" ? { ...block.content } : {};
  const html = String(content.html || "");
  if (/href=["'][^"']*\/engagements/i.test(html)) throw error("MSE_25_47_LINK_DUPLICATE", "Un lien vers engagements existe déjà dans le bloc source.", { siteSlug: proof.siteSlug });
  const sentence = `<p data-seo-link="mse-25.47"><a href="${proof.targetHref}">${proof.anchorText}</a> — ${proof.sentence}</p>`;
  content.html = `${html}${html ? "\n" : ""}${sentence}`;
  block.content = content;
  block.seo = { ...(block.seo || {}), internalLinkBy: "mse-25.47", internalLinkTarget: proof.targetPageSlug };
  return page;
}

function buildInternalLinkWriteIntent({ proof = {}, currentPages = [] } = {}) {
  if (proof.readOnly !== true || proof.writes !== false || proof.policy?.antiDuplicationRequired !== true || proof.policy?.sourceSnapshotRequired !== true) throw error("MSE_25_47_LINK_WRITE_INTENT_PROOF_INVALID", "La preuve de lien MSE-25.47 n'est pas sûre.");
  const pageMap = new Map(currentPages.map((row) => [`${row.siteSlug}:${row.pageSlug}`, row.page || row]));
  const intents = [];
  for (const item of (proof.items || []).filter((row) => row.decision === "sealed-link-candidate")) {
    const key = `${item.siteSlug}:${item.sourcePageSlug}`;
    const page = pageMap.get(key);
    if (!page) throw error("MSE_25_47_LINK_SOURCE_MISSING", "Snapshot source absent.", { key });
    if (digest(page) !== item.sourceSnapshotFingerprint) throw error("MSE_25_47_LINK_SOURCE_FINGERPRINT_MISMATCH", "La page source ne correspond pas à la preuve scellée.", { key });
    const before = saveBody(page);
    const afterPage = appendContextualLink(clone(page), item);
    const after = validatedSaveBody(afterPage, { key });
    intents.push({
      key,
      agencyId: item.agencyId,
      siteSlug: item.siteSlug,
      pageSlug: item.sourcePageSlug,
      targetPageSlug: item.targetPageSlug,
      targetHref: item.targetHref,
      anchorText: item.anchorText,
      sourceSnapshotFingerprint: digest(before),
      targetSnapshotFingerprint: digest(after),
      snapshot: { before, after },
      persistence: { method: "PageBuilderPersistenceService.save", agencyId: item.agencyId, pageSlug: item.sourcePageSlug, body: after },
    });
  }
  const result = {
    version: "mse-25.47",
    operation: "internal-link-write-intent",
    readOnly: true,
    writes: false,
    publicWrites: false,
    linkProofFingerprint: proof.linkProofFingerprint,
    summary: { candidateCount: (proof.items || []).length, touchedPageCount: intents.length, snapshotCount: intents.length, automaticWriteCount: 0 },
    intents,
  };
  return { ...result, writeIntentFingerprint: digest(result) };
}

module.exports = { appendContextualLink, buildInternalLinkWriteIntent, digest };
