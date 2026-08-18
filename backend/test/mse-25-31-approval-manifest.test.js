"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  approvalCandidates,
  createApprovalManifest,
  operationWritePreview,
  writePreview,
} = require("../scripts/mse-25-31-approval-manifest");
const { EXPECTED_BRANCH } = require("../scripts/mse-25-31-preflight");

const FP = "a".repeat(64);
const HEAD = "b".repeat(40);

function payloadForRow(row) {
  const types = row.operationTypes || [];
  const bodyOnly = types.length === 1 && types[0] === "enrich-body";
  return {
    key: `${row.siteSlug}:${row.pageSlug || "home"}`,
    agencyId: row.agencyId ?? null,
    siteSlug: row.siteSlug,
    city: row.city || null,
    pageSlug: row.pageSlug || "home",
    operations: types.map((type) => ({ type })),
    bodyCopyPreview: bodyOnly ? { title: "Informations utiles", html: `<p>Texte exact ${row.siteSlug}.</p>` } : null,
    safeguards: {},
    completeOperationTypes: bodyOnly ? [...types] : [],
    incompleteOperationTypes: bodyOnly ? [] : [...types],
    payloadComplete: bodyOnly && types.length > 0,
  };
}

function preflightReport(rows) {
  const executionPayloads = rows.map(payloadForRow);
  const completePayloadCount = executionPayloads.filter((payload) => payload.payloadComplete).length;
  return {
    version: "mse-25.31",
    operation: "preflight-quality-uplift",
    readOnly: true,
    writes: false,
    destructive: false,
    repository: { branch: EXPECTED_BRANCH, head: HEAD, dirty: false },
    context: {
      backendOrigin: "http://127.0.0.1:4000",
      tenantSlug: "mondescale",
      minimumWords: 120,
      topPages: 20,
    },
    planFingerprint: FP,
    preview: {
      readOnly: true,
      writes: false,
      destructive: false,
      planFingerprint: FP,
      allPages: rows,
      executionPayloads,
    },
    executionPayloadAudit: {
      ok: true,
      candidateCount: rows.length,
      payloadCount: executionPayloads.length,
      completePayloadCount,
      incompletePayloadCount: executionPayloads.length - completePayloadCount,
    },
    determinism: {
      verified: true,
      previewCount: 2,
      firstFingerprint: FP,
      secondFingerprint: FP,
      executionPayloadsVerified: true,
    },
  };
}

const rows = [
  {
    agencyId: 2,
    siteSlug: "nevers",
    city: "Nevers",
    pageSlug: "avis",
    priority: "medium",
    priorityScore: 40,
    executionClass: "manual-review-needed",
    projectedReduction: 1,
    operationTypes: ["strengthen-meta-description"],
    manualReviewReasons: ["strengthen-meta-description"],
  },
  {
    agencyId: 1,
    siteSlug: "gien",
    city: "Gien",
    pageSlug: "avis",
    priority: "high",
    priorityScore: 70,
    executionClass: "simulation-ready",
    projectedReduction: 2,
    operationTypes: ["enrich-body"],
    manualReviewReasons: [],
  },
];

test("approval manifest starts with every candidate explicitly unapproved and exposes exact write evidence", () => {
  const manifest = createApprovalManifest(preflightReport(rows));
  assert.equal(manifest.publicWrites, false);
  assert.equal(manifest.defaultApproval, false);
  assert.equal(manifest.summary.candidateCount, 2);
  assert.equal(manifest.summary.approvedCount, 0);
  assert.equal(manifest.summary.rejectedOrPendingCount, 2);
  assert.equal(manifest.summary.payloadCompleteCount, 1);
  assert.equal(manifest.summary.payloadIncompleteCount, 1);
  assert.equal(manifest.summary.manualReviewNeededCount, 1);
  assert.ok(manifest.candidates.every((candidate) => candidate.approved === false));
  assert.deepEqual(manifest.candidates.map((candidate) => candidate.key), ["gien:avis", "nevers:avis"]);

  const bodyCandidate = manifest.candidates.find((candidate) => candidate.key === "gien:avis");
  const metaCandidate = manifest.candidates.find((candidate) => candidate.key === "nevers:avis");
  assert.match(bodyCandidate.writePayloadFingerprint, /^[0-9a-f]{64}$/);
  assert.equal(bodyCandidate.writePayloadComplete, true);
  assert.equal(bodyCandidate.writePreview.bodyCopy.html, "<p>Texte exact gien.</p>");
  assert.deepEqual(bodyCandidate.writePreview.operations, [
    { type: "enrich-body", target: null, finalValue: null },
  ]);
  assert.equal(metaCandidate.writePayloadComplete, false);
  assert.equal(metaCandidate.writePreview.bodyCopy, null);
  assert.deepEqual(metaCandidate.writePreview.incompleteOperationTypes, ["strengthen-meta-description"]);
  assert.deepEqual(metaCandidate.writePreview.operations, [
    { type: "strengthen-meta-description", target: null, finalValue: null },
  ]);
});

test("operation approval preview exposes exact metadata and internal-link write values", () => {
  const metadata = operationWritePreview({
    type: "strengthen-meta-description",
    target: { scope: "page", field: "metaDescription" },
    finalValue: "Votre agence de voyages à Gien vous accompagne dans vos projets.",
  });
  assert.deepEqual(metadata, {
    type: "strengthen-meta-description",
    target: { scope: "page", field: "metaDescription" },
    finalValue: "Votre agence de voyages à Gien vous accompagne dans vos projets.",
  });

  const internalLink = operationWritePreview({
    type: "add-internal-link",
    target: { scope: "block", pageSlug: "home", blockType: "rich_text", blockId: "copy-home", field: "content.html" },
    sourceValueFingerprint: "c".repeat(64),
    link: { href: "/agence/gien/avis", label: "Découvrir Avis clients" },
    finalValue: "<p>Accueil</p><p><a href=\"/agence/gien/avis\">Découvrir Avis clients</a></p>",
  });
  assert.equal(internalLink.target.blockId, "copy-home");
  assert.equal(internalLink.sourceValueFingerprint, "c".repeat(64));
  assert.deepEqual(internalLink.link, { href: "/agence/gien/avis", label: "Découvrir Avis clients" });
  assert.match(internalLink.finalValue, /href=\"\/agence\/gien\/avis\"/);
});

test("write preview defensively copies exact operation targets and links", () => {
  const payload = {
    payloadComplete: true,
    completeOperationTypes: ["add-internal-link"],
    incompleteOperationTypes: [],
    operations: [{
      type: "add-internal-link",
      target: { scope: "block", pageSlug: "home", blockType: "rich_text", blockId: "copy-home", field: "content.html" },
      sourceValueFingerprint: "d".repeat(64),
      link: { href: "/avis", label: "Avis" },
      finalValue: "<p><a href=\"/avis\">Avis</a></p>",
    }],
  };
  const preview = writePreview(payload);
  payload.operations[0].target.blockId = "tampered";
  payload.operations[0].link.href = "/tampered";
  assert.equal(preview.operations[0].target.blockId, "copy-home");
  assert.equal(preview.operations[0].link.href, "/avis");
});

test("candidate set fingerprint is stable regardless of incoming row order", () => {
  const first = createApprovalManifest(preflightReport(rows));
  const second = createApprovalManifest(preflightReport([...rows].reverse()));
  assert.equal(first.candidateSetFingerprint, second.candidateSetFingerprint);
});

test("candidate set fingerprint changes when the exact sealed write payload changes", () => {
  const firstReport = preflightReport(rows);
  const secondReport = preflightReport(rows);
  secondReport.preview.executionPayloads.find((payload) => payload.key === "gien:avis").bodyCopyPreview.html = "<p>Autre texte exact.</p>";
  secondReport.executionPayloadAudit.completePayloadCount = 1;
  const first = createApprovalManifest(firstReport);
  const second = createApprovalManifest(secondReport);
  assert.notEqual(first.candidateSetFingerprint, second.candidateSetFingerprint);
  assert.notEqual(
    first.candidates.find((candidate) => candidate.key === "gien:avis").writePayloadFingerprint,
    second.candidates.find((candidate) => candidate.key === "gien:avis").writePayloadFingerprint
  );
});

test("approval candidates reject duplicate logical pages", () => {
  assert.throws(
    () => approvalCandidates(preflightReport([rows[0], { ...rows[0] }])),
    (error) => error.code === "MSE_25_31_APPROVAL_CANDIDATE_SET_INVALID"
  );
});

test("approval manifest remains bound to preflight head context and plan fingerprint", () => {
  const manifest = createApprovalManifest(preflightReport(rows));
  assert.equal(manifest.sourcePreflight.repository.head, HEAD);
  assert.equal(manifest.sourcePreflight.repository.branch, EXPECTED_BRANCH);
  assert.equal(manifest.sourcePreflight.context.tenantSlug, "mondescale");
  assert.equal(manifest.sourcePreflight.planFingerprint, FP);
});
