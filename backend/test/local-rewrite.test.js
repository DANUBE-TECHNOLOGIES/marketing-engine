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
} = require("../src/modules/agency-site/local-rewrite-service");

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
