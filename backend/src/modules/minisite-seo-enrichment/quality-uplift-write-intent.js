"use strict";

const crypto = require("node:crypto");

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function sha256Text(value) { return crypto.createHash("sha256").update(String(value ?? ""), "utf8").digest("hex"); }
function normalizedBlockType(block = {}) { return String(block.type || block.blockType || "").trim().toLowerCase().replace(/[_\s]+/g, "-"); }
function normalizedPageSlug(value) {
  const slug = String(value ?? "").trim().replace(/^\/+|\/+$/g, "");
  return !slug || slug === "accueil" ? "home" : slug;
}
function error(code, message, details = {}) { const e = new Error(message); e.code = code; e.status = 409; e.details = details; return e; }
function assertSourceFingerprint(value, operation = {}, details = {}) {
  const expected = String(operation.sourceValueFingerprint || "").trim().toLowerCase();
  const actual = sha256Text(value);
  if (!/^[0-9a-f]{64}$/.test(expected) || actual !== expected) {
    throw error("MSE_25_31_WRITE_INTENT_SOURCE_MISMATCH", "La valeur persistée ne correspond plus à la source scellée.", { ...details, expectedSourceFingerprint: expected || null, actualSourceFingerprint: actual });
  }
}
function pageKey(siteSlug, pageSlug) { return `${String(siteSlug || "").trim()}:${normalizedPageSlug(pageSlug)}`; }
function normalizeCurrentPage(record = {}) {
  const page = clone(record.page || record);
  const siteSlug = String(record.siteSlug || page.siteSlug || "").trim();
  const agencyId = record.agencyId ?? page.agencyId ?? null;
  const pageSlug = normalizedPageSlug(page.slug);
  if (!siteSlug || agencyId == null || !page.title) throw error("MSE_25_31_WRITE_INTENT_CURRENT_PAGE_INVALID", "Snapshot Website Designer V2 incomplet.", { siteSlug: siteSlug || null, agencyId, pageSlug });
  page.blocks = Array.isArray(page.blocks) ? page.blocks : [];
  return { key: pageKey(siteSlug, pageSlug), siteSlug, agencyId, pageSlug, page };
}
function currentPageMap(currentPages = []) {
  const map = new Map();
  for (const row of currentPages) {
    const item = normalizeCurrentPage(row);
    if (map.has(item.key)) throw error("MSE_25_31_WRITE_INTENT_CURRENT_PAGE_DUPLICATE", "Snapshot courant dupliqué.", { key: item.key });
    map.set(item.key, item);
  }
  return map;
}
function requirePage(map, siteSlug, slug, candidateKey) {
  const key = pageKey(siteSlug, slug);
  const row = map.get(key);
  if (!row) throw error("MSE_25_31_WRITE_INTENT_CURRENT_PAGE_MISSING", "Snapshot courant absent pour une page touchée.", { key, candidateKey });
  return row;
}
function requireBlock(row, target = {}, candidateKey) {
  const block = (row.page.blocks || []).find((item) => String(item?.id) === String(target.blockId));
  if (!block) throw error("MSE_25_31_WRITE_INTENT_BLOCK_MISSING", "Le bloc scellé n'existe plus.", { candidateKey, pageKey: row.key, blockId: target.blockId ?? null });
  return block;
}
function applyMetadata(row, operation, candidateKey) {
  if (operation.type === "strengthen-title") {
    if (operation.target?.scope !== "page" || operation.target?.field !== "seoTitle") throw error("MSE_25_31_WRITE_INTENT_TARGET_INVALID", "Cible seoTitle invalide.", { candidateKey });
    assertSourceFingerprint(row.page.seoTitle ?? "", operation, { candidateKey, pageKey: row.key, field: "seoTitle" });
    row.page.seoTitle = operation.finalValue;
    return;
  }
  if (operation.type === "strengthen-meta-description") {
    if (operation.target?.scope !== "page" || operation.target?.field !== "metaDescription") throw error("MSE_25_31_WRITE_INTENT_TARGET_INVALID", "Cible metaDescription invalide.", { candidateKey });
    assertSourceFingerprint(row.page.metaDescription ?? row.page.seoDescription ?? "", operation, { candidateKey, pageKey: row.key, field: "metaDescription" });
    row.page.metaDescription = operation.finalValue;
    row.page.seoDescription = operation.finalValue;
    return;
  }
  if (operation.type === "strengthen-h1") {
    if (operation.target?.scope !== "block" || operation.target?.blockType !== "hero" || operation.target?.field !== "title" || operation.target?.blockId == null) throw error("MSE_25_31_WRITE_INTENT_TARGET_INVALID", "Cible H1 invalide.", { candidateKey });
    const block = requireBlock(row, operation.target, candidateKey);
    if (normalizedBlockType(block) !== "hero") throw error("MSE_25_31_WRITE_INTENT_TARGET_INVALID", "Le bloc H1 n'est plus un Hero.", { candidateKey, pageKey: row.key, blockId: block.id });
    assertSourceFingerprint(block.content?.title ?? "", operation, { candidateKey, pageKey: row.key, blockId: block.id, field: "title" });
    block.content = { ...(block.content || {}), title: operation.finalValue };
  }
}
function applyInternalLink(map, page, operation) {
  const target = operation.target || {};
  if (target.scope !== "block" || target.blockType !== "rich_text" || target.field !== "content.html" || !String(target.pageSlug || "").trim() || target.blockId == null) throw error("MSE_25_31_WRITE_INTENT_TARGET_INVALID", "Cible de maillage interne invalide.", { candidateKey: page.key });
  const row = requirePage(map, page.siteSlug, target.pageSlug, page.key);
  const block = requireBlock(row, target, page.key);
  if (normalizedBlockType(block) !== "rich-text") throw error("MSE_25_31_WRITE_INTENT_TARGET_INVALID", "Le bloc de maillage n'est plus un rich_text.", { candidateKey: page.key, pageKey: row.key, blockId: block.id });
  assertSourceFingerprint(block.content?.html ?? "", operation, { candidateKey: page.key, pageKey: row.key, blockId: block.id, field: "content.html" });
  block.content = { ...(block.content || {}), html: operation.finalValue };
  return row;
}
function appendBody(row, payload, candidateKey) {
  const preview = payload.bodyCopyPreview;
  if (!String(preview?.title || "").trim() || !String(preview?.html || "").trim()) throw error("MSE_25_31_WRITE_INTENT_BODY_MISSING", "Le body approuvé est incomplet.", { candidateKey });
  row.page.blocks.push({ type: "rich_text", status: "published", position: row.page.blocks.length, content: { title: preview.title, html: preview.html }, settings: {}, seo: { generatedBy: "mse-25.31", purpose: "local-seo-quality-uplift" }, visibleDesktop: true, visibleMobile: true });
}
function saveBody(page = {}) {
  return {
    page: { title: page.title, slug: page.slug, status: page.status || (page.published === true ? "published" : "draft"), seoTitle: page.seoTitle || "", metaDescription: page.metaDescription ?? page.seoDescription ?? "", published: page.published === true },
    blocks: (page.blocks || []).map((block, index) => ({ type: block.type || block.blockType, status: block.status || "published", position: Number.isFinite(Number(block.position ?? block.displayOrder)) ? Number(block.position ?? block.displayOrder) : index, content: clone(block.content || {}), settings: clone(block.settings || {}), seo: clone(block.seo || {}), visibleDesktop: block.visibleDesktop !== false, visibleMobile: block.visibleMobile !== false })),
  };
}
function buildQualityUpliftWriteIntents({ executionPlan = {}, currentPages = [] } = {}) {
  if (executionPlan.version !== "mse-25.31" || executionPlan.operation !== "quality-uplift-execution-plan" || executionPlan.readOnly !== true || executionPlan.writes !== false || executionPlan.publicWrites !== false || executionPlan.executable !== true) {
    throw error("MSE_25_31_WRITE_INTENT_PLAN_NOT_EXECUTABLE", "Le write-intent exige un plan scellé et exécutable.", { executionPlanFingerprint: executionPlan.executionPlanFingerprint || null });
  }
  const map = currentPageMap(currentPages);
  const touched = new Set();
  for (const page of executionPlan.pages || []) {
    if (page.executionPayloadComplete !== true || page.executionPayload?.payloadComplete !== true) throw error("MSE_25_31_WRITE_INTENT_PAYLOAD_INCOMPLETE", "Un payload approuvé n'est pas entièrement scellé.", { candidateKey: page.key });
    const primary = requirePage(map, page.siteSlug, page.pageSlug, page.key);
    if (Number(primary.agencyId) !== Number(page.agencyId)) throw error("MSE_25_31_WRITE_INTENT_AGENCY_MISMATCH", "Le snapshot courant n'appartient pas à l'agence approuvée.", { candidateKey: page.key, expectedAgencyId: page.agencyId, actualAgencyId: primary.agencyId });
    for (const operation of page.executionPayload.operations || []) {
      if (operation.type === "enrich-body") { appendBody(primary, page.executionPayload, page.key); touched.add(primary.key); }
      else if (["strengthen-title", "strengthen-meta-description", "strengthen-h1"].includes(operation.type)) { applyMetadata(primary, operation, page.key); touched.add(primary.key); }
      else if (operation.type === "add-internal-link") { touched.add(applyInternalLink(map, page, operation).key); }
      else throw error("MSE_25_31_WRITE_INTENT_OPERATION_UNSUPPORTED", "Une opération approuvée n'est pas prise en charge.", { candidateKey: page.key, operationType: operation.type || null });
    }
  }
  const intents = [...touched].sort((a, b) => a.localeCompare(b, "fr")).map((key) => {
    const row = map.get(key);
    return { key, agencyId: row.agencyId, siteSlug: row.siteSlug, pageSlug: row.pageSlug, persistence: { method: "PageBuilderPersistenceService.save", agencyId: row.agencyId, pageSlug: row.pageSlug, body: saveBody(row.page) } };
  });
  return { version: "mse-25.31", operation: "quality-uplift-write-intent", readOnly: true, writes: false, publicWrites: false, persistenceCallsPerformed: 0, executionPlanFingerprint: executionPlan.executionPlanFingerprint, summary: { approvedCandidateCount: (executionPlan.pages || []).length, touchedPageCount: intents.length }, intents };
}

module.exports = { buildQualityUpliftWriteIntents, assertSourceFingerprint, currentPageMap, normalizedBlockType, normalizedPageSlug, pageKey, saveBody, sha256Text };
