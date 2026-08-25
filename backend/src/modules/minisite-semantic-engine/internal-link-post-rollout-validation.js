"use strict";

const crypto = require("node:crypto");
const { saveBody } = require("../minisite-seo-enrichment/quality-uplift-write-intent");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}
function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}
function blockHtml(block = {}) {
  return typeof block?.content?.html === "string" ? block.content.html : "";
}
function validatePersistedTarget({ manifest = {}, currentPage = {}, semanticOrphan = null } = {}) {
  const body = saveBody(currentPage);
  const currentSnapshotFingerprint = digest(body);
  const expectedTargetSnapshotFingerprint = String(manifest.targetSnapshotFingerprint || "").trim().toLowerCase();
  const blocks = Array.isArray(currentPage.blocks) ? currentPage.blocks : [];
  const markedBlocks = blocks.filter((block) => block?.seo?.internalLinkBy === "mse-25.47" && block?.seo?.internalLinkTarget === "engagements");
  const html = blocks.map(blockHtml).join("\n");
  const linkCount = (html.match(/href\s*=\s*["']\/engagements["']/gi) || []).length;
  const markerCount = (html.match(/data-seo-link\s*=\s*["']mse-25\.47["']/gi) || []).length;
  const snapshotMatches = /^[0-9a-f]{64}$/.test(expectedTargetSnapshotFingerprint) && currentSnapshotFingerprint === expectedTargetSnapshotFingerprint;
  const linkPersisted = linkCount === 1 && markerCount === 1 && markedBlocks.length === 1;
  return {
    agencyId: manifest.agencyId,
    siteSlug: manifest.siteSlug,
    pageSlug: manifest.pageSlug,
    targetPageSlug: "engagements",
    expectedTargetSnapshotFingerprint,
    currentSnapshotFingerprint,
    snapshotMatches,
    markedBlockCount: markedBlocks.length,
    linkCount,
    markerCount,
    linkPersisted,
    semanticGraphOrphan: semanticOrphan,
    closed: snapshotMatches && linkPersisted,
  };
}

function buildPostRolloutValidation({ rollout = {}, currentPages = [], preview = null } = {}) {
  const manifest = rollout?.rollbackManifest || rollout?.result?.rollbackManifest || [];
  if (rollout?.result?.ok !== true || rollout?.result?.dryRun !== false || rollout?.result?.pagesWritten !== manifest.length || manifest.length === 0) {
    const error = new Error("Le rapport de rollout MSE-25.47 n'est pas un rollout réel complet.");
    error.code = "MSE_25_47_POST_ROLLOUT_SOURCE_INVALID";
    throw error;
  }
  const pageMap = new Map(currentPages.map((row) => [`${row.siteSlug}:${row.pageSlug || row.page?.slug}`, row.page || row]));
  const details = manifest.map((row) => {
    const page = pageMap.get(`${row.siteSlug}:${row.pageSlug}`);
    if (!page) {
      return { agencyId: row.agencyId, siteSlug: row.siteSlug, pageSlug: row.pageSlug, targetPageSlug: "engagements", snapshotMatches: false, markedBlockCount: 0, linkCount: 0, markerCount: 0, linkPersisted: false, semanticGraphOrphan: null, closed: false, reason: "current-source-page-missing" };
    }
    const agency = (preview?.agencies || []).find((item) => String(item.site?.slug) === String(row.siteSlug));
    const semanticOrphan = agency ? (agency.topicGraph?.orphanPages || []).includes("engagements") : null;
    return validatePersistedTarget({ manifest: row, currentPage: page, semanticOrphan });
  });
  const summary = {
    targetCount: details.length,
    closedTargetCount: details.filter((row) => row.closed).length,
    openTargetCount: details.filter((row) => !row.closed).length,
    persistedLinkCount: details.filter((row) => row.linkPersisted).length,
    targetSnapshotMatchCount: details.filter((row) => row.snapshotMatches).length,
    semanticGraphReportedOrphanCount: details.filter((row) => row.semanticGraphOrphan === true).length,
    automaticWriteCount: 0,
    closureCertified: details.length > 0 && details.every((row) => row.closed),
  };
  const report = {
    type: "mse-25.47-post-rollout-validation",
    readOnly: true,
    writes: false,
    rolloutReportFingerprint: rollout.reportFingerprint,
    policy: {
      persistedLinkIsClosureAuthority: true,
      semanticTopicGraphIsObservational: true,
      targetSnapshotMustMatch: true,
      exactSingleLinkRequired: true,
      automaticWrites: false,
    },
    targets: details,
    summary,
  };
  return { ...report, validationFingerprint: digest(report) };
}

module.exports = { buildPostRolloutValidation, digest, validatePersistedTarget };
