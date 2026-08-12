const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildLocalRewriteProposal,
  localProofSentences,
  escapeHtml,
} = require("../src/modules/agency-site/local-rewrite");
const {
  buildDraftTarget,
  normalizeDraftBlock,
  buildRewriteImpact,
  buildDifferentiationSummary,
} = require("../src/modules/agency-site/local-rewrite-service");
const { pageSlugCandidates } = require("../src/modules/agency-site/page-slug");

const evidence = {
  agencyName: "Mondescale Gien",
  city: "Gien",
  team: [{ name: "Marie-Claire" }],
  reviews: { observedCount: 12, averageRating: 4.8 },
  keywordCities: ["Gien", "Montargis"],
  evidence: [
    { code: "CITY", label: "Ville", value: "Gien", source: "Agency.city" },
    { code: "POSTAL_CODE", label: "Code postal", value: "45500", source: "Agency.postalCode" },
    { code: "ADDRESS", label: "Adresse", value: "10 rue du Voyage", source: "Agency.address" },
    { code: "TEAM", label: "Équipe", value: "Marie-Claire", source: "AgencySitePageBlock.team" },
    { code: "REVIEWS", label: "Avis", value: "12", source: "Agency.reviews" },
    { code: "LOCAL_CITIES", label: "Villes", value: "Gien, Montargis", source: "Agency.keywords.city" },
  ],
};

test("les phrases locales restent limitées aux preuves vérifiées", () => {
  const result = localProofSentences(evidence);
  const copy = result.sentences.join(" ");
  assert.match(copy, /Mondescale Gien/);
  assert.match(copy, /Gien/);
  assert.match(copy, /Marie-Claire/);
  assert.match(copy, /10 rue du Voyage/);
  assert.match(copy, /12 avis/);
  assert.doesNotMatch(copy, /spécialiste|expert|meilleur|personnalisé|passionné/i);
});

test("une proposition remplace un passage partagé uniquement avec des preuves auditables", () => {
  const proposal = buildLocalRewriteProposal({
    block: {
      id: "block-1",
      type: "rich_text",
      content: { html: "<p>Notre agence vous accompagne pour construire le voyage qui vous ressemble avec écoute et disponibilité.</p>" },
    },
    localEvidence: evidence,
    insight: {
      sharedSegments: ["notre agence vous accompagne pour construire le voyage qui vous ressemble"],
    },
  });

  assert.equal(proposal.eligible, true);
  assert.equal(proposal.mode, "proposal-only");
  assert.equal(proposal.safeguards.verifiedEvidenceOnly, true);
  assert.equal(proposal.safeguards.persistedAutomatically, false);
  assert.equal(proposal.safeguards.userValidationRequired, true);
  assert.doesNotMatch(proposal.after, /voyage qui vous ressemble/);
  assert.match(proposal.after, /Gien/);
  assert.ok(proposal.after.split(/\s+/).length >= 12);
});

test("une preuve locale insuffisante ne peut pas produire un faux gain d’audit", () => {
  const proposal = buildLocalRewriteProposal({
    block: {
      id: "block-2",
      type: "rich_text",
      content: { text: "Notre agence vous accompagne pour construire le voyage qui vous ressemble avec écoute et disponibilité." },
    },
    localEvidence: {
      agencyName: "Mondescale Gien",
      city: "Gien",
      evidence: [{ code: "CITY", label: "Ville", value: "Gien", source: "Agency.city" }],
    },
    insight: {
      sharedSegments: ["notre agence vous accompagne pour construire le voyage qui vous ressemble"],
    },
  });

  assert.equal(proposal.eligible, false);
  assert.equal(proposal.reason, "INSUFFICIENT_VERIFIED_EVIDENCE_FOR_AUDITABLE_REWRITE");
});

test("le HTML de la proposition est échappé avant réinjection", () => {
  assert.equal(escapeHtml('Agence <Gien> & "Voyages"'), "Agence &lt;Gien&gt; &amp; &quot;Voyages&quot;");
});

test("le brouillon Designer est normalisé dans le format attendu par l’audit", () => {
  const block = normalizeDraftBlock({ id: "b-1", type: "image_text", position: 3, content: { text: "Texte local" } }, 0);
  assert.deepEqual(block, {
    id: "b-1",
    blockType: "image_text",
    name: "image_text",
    displayOrder: 3,
    content: { text: "Texte local" },
  });

  const persisted = {
    id: "page-1",
    title: "Ancien titre",
    seoTitle: "Ancien SEO",
    metaDescription: "Ancienne meta",
    blocks: [],
    sections: [{ id: "section-1" }],
  };
  const target = buildDraftTarget(persisted, {
    title: "Titre brouillon",
    seoTitle: "SEO brouillon",
    seoDescription: "Meta brouillon",
    blocks: [{ id: "b-1", type: "rich_text", position: 0, content: { html: "<p>Brouillon courant avec suffisamment de texte éditorial.</p>" } }],
  });

  assert.equal(target.title, "Titre brouillon");
  assert.equal(target.seoTitle, "SEO brouillon");
  assert.equal(target.metaDescription, "Meta brouillon");
  assert.equal(target.blocks[0].blockType, "rich_text");
  assert.equal(target.blocks[0].id, "b-1");
  assert.deepEqual(target.sections, []);
});

test("un gain bloc mesurable sans régression page est autorisé", () => {
  const impact = buildRewriteImpact(
    { highestSimilarity: 0.62, score: 38, ready: false, severity: "warning" },
    { highestSimilarity: 0.51, score: 49, ready: true, severity: "ok" },
    { highestSimilarity: 0.48, score: 52 },
    { highestSimilarity: 0.21, score: 79 }
  );

  assert.equal(impact.safeToApply, true);
  assert.equal(impact.reason, "MEASURABLE_UNIQUENESS_GAIN");
  assert.equal(impact.block.similarityGain, 0.27);
  assert.equal(impact.page.similarityGain, 0.11);
  assert.equal(impact.page.readyBefore, false);
  assert.equal(impact.page.readyAfter, true);
});

test("une proposition sans gain bloc est bloquée", () => {
  const impact = buildRewriteImpact(
    { highestSimilarity: 0.48, score: 52, ready: true, severity: "ok" },
    { highestSimilarity: 0.48, score: 52, ready: true, severity: "ok" },
    { highestSimilarity: 0.31, score: 69 },
    { highestSimilarity: 0.31, score: 69 }
  );

  assert.equal(impact.safeToApply, false);
  assert.equal(impact.reason, "NO_MEASURABLE_BLOCK_GAIN");
});

test("une amélioration locale qui dégrade la page est bloquée", () => {
  const impact = buildRewriteImpact(
    { highestSimilarity: 0.40, score: 60, ready: true, severity: "ok" },
    { highestSimilarity: 0.57, score: 43, ready: false, severity: "warning" },
    { highestSimilarity: 0.52, score: 48 },
    { highestSimilarity: 0.20, score: 80 }
  );

  assert.equal(impact.blockImproved, true);
  assert.equal(impact.pageDidNotRegress, false);
  assert.equal(impact.safeToApply, false);
  assert.equal(impact.reason, "PAGE_UNIQUENESS_REGRESSION");
});

test("une page différenciée sans bloc prioritaire est prête pour revue", () => {
  const summary = buildDifferentiationSummary(
    {
      ready: true,
      severity: "ok",
      score: 72,
      highestSimilarity: 0.28,
      blockInsights: [{ blockId: "b-1", blockType: "rich_text", blockName: "Présentation", highestSimilarity: 0.24, score: 76 }],
    },
    evidence
  );

  assert.equal(summary.readyForReview, true);
  assert.equal(summary.status, "ready-for-review");
  assert.equal(summary.priorityBlockCount, 0);
  assert.deepEqual(summary.reasons, []);
});

test("un bloc encore très proche du réseau empêche la sortie de différenciation", () => {
  const summary = buildDifferentiationSummary(
    {
      ready: true,
      severity: "ok",
      score: 61,
      highestSimilarity: 0.39,
      blockInsights: [{ blockId: "b-2", blockType: "rich_text", blockName: "Pourquoi nous", highestSimilarity: 0.46, score: 54 }],
    },
    evidence
  );

  assert.equal(summary.readyForReview, false);
  assert.equal(summary.status, "needs-differentiation");
  assert.equal(summary.priorityBlockCount, 1);
  assert.equal(summary.priorityBlocks[0].blockId, "b-2");
  assert.ok(summary.reasons.includes("PRIORITY_BLOCKS_REMAIN"));
});

test("une page sans preuve locale vérifiée ne peut pas être considérée prête pour revue", () => {
  const summary = buildDifferentiationSummary(
    { ready: true, severity: "ok", score: 80, highestSimilarity: 0.15, blockInsights: [] },
    { evidence: [] }
  );

  assert.equal(summary.readyForReview, false);
  assert.ok(summary.reasons.includes("NO_VERIFIED_LOCAL_EVIDENCE"));
});

test("Website Builder résout home vers le slug moderne puis le slug racine historique", () => {
  assert.deepEqual(pageSlugCandidates("home"), ["home", ""]);
  assert.deepEqual(pageSlugCandidates(""), ["home", ""]);
  assert.deepEqual(pageSlugCandidates("services"), ["services"]);
});
