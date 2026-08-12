"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  collectEditorialText,
  blockText,
  pageText,
  similarity,
  sharedSegments,
  distinctiveTerms,
  analyzeUniqueness
} = require("./content-uniqueness");

test("identical local copy is detected", () => {
  assert.equal(
    similarity(
      "agence voyage locale conseil expert famille paris",
      "agence voyage locale conseil expert famille paris"
    ),
    1
  );
});

test("different copy remains distinct", () => {
  assert.ok(
    similarity(
      "conseillers bois colombes rendez vous avenue argenteuil voyages sur mesure",
      "equipe gien circuits groupes depart montargis accompagnement croisiere"
    ) < 0.3
  );
});

test("high network similarity blocks readiness from structured sections", () => {
  const sections = [
    {
      jsonContent: {
        html: "Notre agence locale vous accompagne pour construire votre voyage sur mesure avec des conseils personnalises et un suivi avant pendant apres votre depart."
      }
    }
  ];
  const target = { id: "a", title: "Voyage sur mesure", sections };
  const other = {
    id: "b",
    title: "Voyage sur mesure",
    sections,
    site: { agencyId: 2, agency: { name: "Agence B" } }
  };
  const result = analyzeUniqueness(target, [other]);
  assert.equal(result.ready, false);
  assert.equal(result.severity, "blocker");
});

test("V2 PageBlock content participates in uniqueness analysis", () => {
  const blocks = [
    {
      id: "hero-a",
      blockType: "hero",
      content: {
        title: "Votre agence de voyages locale",
        html: "Nos conseillers construisent avec vous un itineraire personnalise, suivent votre dossier et restent disponibles avant pendant et apres le voyage.",
        items: [
          {
            title: "Conseil",
            text: "Rendez vous en agence pour parler de votre projet."
          }
        ]
      }
    }
  ];
  const target = { id: "a", title: "Accueil", blocks };
  const other = {
    id: "b",
    title: "Accueil",
    blocks,
    site: { agencyId: 2, agency: { name: "Agence B" } }
  };
  assert.match(pageText(target), /itineraire personnalise/);
  const result = analyzeUniqueness(target, [other]);
  assert.equal(result.ready, false);
  assert.equal(result.severity, "blocker");
  assert.ok(result.metrics.targetWordCount > 10);
});

test("shared segments explain what must be rewritten", () => {
  const common =
    "nos conseillers construisent avec vous un voyage personnalise et restent disponibles avant pendant apres votre depart";
  const segments = sharedSegments(
    common + " bois colombes",
    common + " maurepas",
    8,
    5
  );
  assert.ok(segments.length >= 1);
  assert.match(segments[0], /conseillers construisent/);
});

test("editorial extraction ignores presentation configuration", () => {
  const chunks = [];
  collectEditorialText(
    {
      align: "left",
      variant: "primary",
      backgroundColor: "#ffffff",
      url: "https://example.test/contact",
      title: "Echangez avec votre conseillere de Bois-Colombes",
      body: "Construisons ensemble un projet adapte a vos envies et a votre budget.",
      nested: {
        position: "center",
        text: "Un accompagnement humain depuis notre agence des Hauts-de-Seine."
      }
    },
    chunks
  );
  const text = chunks.join(" ").toLowerCase();
  assert.doesNotMatch(text, /\bleft\b/);
  assert.doesNotMatch(text, /\bprimary\b/);
  assert.doesNotMatch(text, /example\.test/);
  assert.match(text, /bois-colombes/);
  assert.match(text, /accompagnement humain/);
});

test("block text ignores style tokens while keeping editorial copy", () => {
  const text = blockText({
    content: {
      alignment: "left",
      ctaVariant: "primary",
      title: "Demandez votre devis depuis Bois-Colombes",
      description:
        "Notre equipe prepare votre voyage en tenant compte de votre projet et de vos habitudes de depart."
    }
  });
  assert.doesNotMatch(text, /\bleft\b/);
  assert.doesNotMatch(text, /\bprimary\b/);
  assert.match(text, /demandez votre devis/);
});

test("analysis returns actionable local differentiation guidance", () => {
  const common =
    "nos conseillers construisent avec vous un voyage personnalise et restent disponibles avant pendant apres votre depart avec un accompagnement attentif";
  const target = {
    id: "a",
    title: "Accueil",
    blocks: [
      {
        id: "hero-bois",
        blockType: "hero",
        name: "Hero agence",
        displayOrder: 0,
        content: {
          html: common + " rendez vous bois colombes avenue argenteuil"
        }
      }
    ],
    site: {
      agencyId: 6,
      agency: { name: "Mondescale Bois-Colombes", city: "Bois-Colombes" }
    }
  };
  const other = {
    id: "b",
    title: "Accueil",
    blocks: [
      {
        id: "hero-maurepas",
        blockType: "hero",
        name: "Hero agence",
        displayOrder: 0,
        content: { html: common + " rendez vous maurepas centre ville" }
      }
    ],
    site: {
      agencyId: 2,
      agency: { name: "Mondescale Maurepas", city: "Maurepas" }
    }
  };
  const result = analyzeUniqueness(target, [other]);
  assert.equal(result.version, "1.3");
  assert.ok(result.sharedSegments.length);
  assert.ok(result.recommendations.some((item) => item.code === "ADD_LOCAL_PROOFS"));
  assert.ok(
    result.distinctiveTerms.some(
      (item) => item.term === "bois" || item.term === "colombes"
    )
  );
  assert.equal(result.metrics.sharedSegmentCount, result.sharedSegments.length);
});

test("Designer V2 duplication is attributed to the exact block", () => {
  const shared =
    "notre equipe vous accompagne avant pendant et apres votre voyage avec un suivi personnalise et des conseils adaptes a votre projet";
  const target = {
    id: "page-a",
    blocks: [
      {
        id: "block-target-42",
        blockType: "trust",
        name: "Accompagnement",
        displayOrder: 3,
        content: {
          alignment: "left",
          variant: "primary",
          text: shared + " depuis bois colombes"
        }
      },
      {
        id: "block-unique",
        blockType: "local-proof",
        displayOrder: 4,
        content: {
          text: "Retrouvez notre equipe avenue d Argenteuil pour preparer les departs depuis Paris et les Hauts de Seine selon vos contraintes."
        }
      }
    ],
    site: {
      agencyId: 6,
      agency: { name: "Mondescale Bois-Colombes", city: "Bois-Colombes" }
    }
  };
  const other = {
    id: "page-b",
    slug: "home",
    blocks: [
      {
        id: "block-other-9",
        blockType: "trust",
        displayOrder: 2,
        content: { text: shared + " depuis maurepas" }
      }
    ],
    site: {
      agencyId: 2,
      agency: { name: "Mondescale Maurepas", city: "Maurepas" }
    }
  };
  const result = analyzeUniqueness(target, [other]);
  const insight = result.blockInsights.find(
    (item) => item.blockId === "block-target-42"
  );
  assert.ok(insight);
  assert.equal(insight.blockType, "trust");
  assert.equal(insight.blockName, "Accompagnement");
  assert.equal(insight.displayOrder, 3);
  assert.ok(insight.sharedSegments.length >= 1);
  assert.equal(insight.nearestMatches[0].blockId, "block-other-9");
  assert.ok(
    insight.recommendations.some(
      (item) => item.code === "DIFFERENTIATE_BLOCK_COPY"
    )
  );
  assert.equal(result.metrics.blocksFlagged, 1);
});

test("distinctive terms ignore generic travel vocabulary", () => {
  const terms = distinctiveTerms(
    "agence voyage voyage bois colombes colombes avenue argenteuil conseillers"
  );
  assert.ok(!terms.some((item) => item.term === "voyage"));
  assert.ok(terms.some((item) => item.term === "colombes"));
});
