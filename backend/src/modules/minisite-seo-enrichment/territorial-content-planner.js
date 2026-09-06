"use strict";

const crypto = require("node:crypto");

const VERSION = "mse-25.125ai-v1";

const TERRITORIES = Object.freeze([
  "Levallois-Perret",
  "Asnières-sur-Seine",
  "Clichy",
  "Neuilly-sur-Seine",
]);

const TARGET_PAGES = Object.freeze([
  "agence",
  "services",
  "destinations",
  "engagements",
]);

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(String(value ?? ""), "utf8")
    .digest("hex");
}

function normalizeType(block = {}) {
  return String(block.type || block.blockType || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function cityCoverage(html = "") {
  const value = normalize(html);

  return TERRITORIES.filter(
    (city) => value.includes(normalize(city))
  );
}

function findLocalBlock(page = {}) {
  const legacyTerritories = [
    "Colombes",
    "Asnières-sur-Seine",
    "La Garenne-Colombes",
  ];

  const candidates = (page.blocks || [])
    .map((block, index) => {
      if (
        normalizeType(block) !== "rich-text" ||
        String(block?.status || "").toLowerCase() !== "published" ||
        typeof block?.content?.html !== "string"
      ) {
        return null;
      }

      const html = normalize(block.content.html);

      const hasBois =
        html.includes(normalize("Bois-Colombes"));

      const nearbyMatches =
        legacyTerritories.filter(
          (city) => html.includes(normalize(city))
        );

      /*
       * Historical local-area blocks contain Bois-Colombes
       * plus the three original nearby service-area cities.
       *
       * This intentionally ignores mutable SEO metadata,
       * because the persisted Website Designer blocks do not
       * retain mse-25.30 generatedBy/purpose consistently.
       */
      const territorialSignature =
        hasBois && nearbyMatches.length >= 2;

      if (!territorialSignature) {
        return null;
      }

      return {
        block,
        index,
        nearbyMatches,
        score:
          (hasBois ? 10 : 0) +
          nearbyMatches.length * 10,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.index - b.index
    );

  if (!candidates.length) {
    return null;
  }

  /*
   * Fail closed if two different blocks are equally good.
   * We never guess which persisted block to overwrite.
   */
  if (
    candidates.length > 1 &&
    candidates[0].score === candidates[1].score
  ) {
    return null;
  }

  return candidates[0];
}

function replacement(pageSlug) {
  const cities =
    "Levallois-Perret, Asnières-sur-Seine, Clichy et Neuilly-sur-Seine";

  const content = {
    agence: {
      title:
        "Votre agence de Bois-Colombes au service des voyageurs du secteur",

      html:
        `<p>Notre agence est située à Bois-Colombes et accueille également ` +
        `des voyageurs de ${cities}. Notre équipe les accompagne pour ` +
        `définir leur projet, comparer les solutions adaptées à leurs dates ` +
        `et à leur budget, puis suivre leur dossier jusqu’au départ.</p>`,
    },

    services: {
      title:
        "Des services voyage pour Bois-Colombes et les communes voisines",

      html:
        `<p>Depuis notre agence de Bois-Colombes, nous accompagnons également ` +
        `les voyageurs de ${cities}. Selon le projet, nos conseillers peuvent ` +
        `intervenir sur la recherche du séjour, les transports, l’hébergement, ` +
        `la billetterie, les assurances, les formalités et le suivi de la ` +
        `réservation.</p>`,
    },

    destinations: {
      title:
        "Préparer votre destination avec notre équipe de Bois-Colombes",

      html:
        `<p>Les voyageurs de ${cities} peuvent faire appel à notre agence ` +
        `de Bois-Colombes pour transformer une envie de destination en projet ` +
        `concret. Saison, durée, rythme du voyage, budget et prestations sont ` +
        `mis en perspective avec un conseiller avant de retenir les solutions ` +
        `les plus cohérentes.</p>`,
    },

    engagements: {
      title:
        "Un accompagnement de proximité depuis Bois-Colombes",

      html:
        `<p>Notre engagement de conseil s’adresse aux clients de Bois-Colombes ` +
        `comme aux voyageurs de ${cities}. L’accompagnement est assuré par ` +
        `notre équipe de Bois-Colombes, avec une attention particulière portée ` +
        `à la clarté des propositions, à l’écoute du projet et à la continuité ` +
        `du suivi.</p>`,
    },
  };

  return content[pageSlug] || null;
}

function buildTerritorialContentPreview({
  site = {},
  campaignId = 11,
} = {}) {
  if (
    Number(site.agencyId || site.agency?.id) !== 6 ||
    String(site.slug || "") !==
      "ambassade-fram-mondescale-bois-colombes" ||
    Number(campaignId) !== 11
  ) {
    const error = new Error(
      "Territorial content preview restricted to Bois-Colombes Wave 1."
    );

    error.code = "MSE_25_125AI_CONTENT_SCOPE_MISMATCH";
    throw error;
  }

  const proposals = [];

  for (const pageSlug of TARGET_PAGES) {
    const page = (site.pages || []).find(
      (row) => String(row.slug || "") === pageSlug
    );

    if (!page) {
      proposals.push({
        pageSlug,
        status: "manual-review",
        reason: "page-missing",
      });

      continue;
    }

    const source = findLocalBlock(page);

    if (!source) {
      proposals.push({
        pageSlug,
        status: "manual-review",
        reason: "local-area-block-missing",
      });

      continue;
    }

    const beforeHtml =
      String(source.block.content.html || "");

    const beforeCoverage =
      cityCoverage(beforeHtml);

    if (beforeCoverage.length === TERRITORIES.length) {
      proposals.push({
        pageSlug,
        status: "already-present",
        coveredBefore: beforeCoverage,
      });

      continue;
    }

    const after = replacement(pageSlug);

    proposals.push({
      pageSlug,
      status: "sealed-candidate",

      sourceBlockId:
        source.block.id ?? null,

      sourceBlockIndex:
        source.index,

      sourceValueFingerprint:
        sha256(beforeHtml),

      coveredBefore:
        beforeCoverage,

      coveredAfter:
        cityCoverage(after.html),

      before: {
        title:
          String(source.block.content?.title || ""),
        html:
          beforeHtml,
      },

      after,
    });
  }

  return {
    version: VERSION,
    operation: "territorial-content-preview",

    readOnly: true,
    writes: false,
    publicWrites: false,
    destructive: false,

    persistenceCallsPerformed: 0,
    providerCalls: 0,
    externalCalls: 0,

    agencyId: 6,
    campaignId: 11,

    siteSlug:
      "ambassade-fram-mondescale-bois-colombes",

    territories:
      [...TERRITORIES],

    proposals,

    summary: {
      proposalCount:
        proposals.length,

      sealedCandidateCount:
        proposals.filter(
          (row) => row.status === "sealed-candidate"
        ).length,

      alreadyPresentCount:
        proposals.filter(
          (row) => row.status === "already-present"
        ).length,

      manualReviewCount:
        proposals.filter(
          (row) => row.status === "manual-review"
        ).length,
    },
  };
}

module.exports = {
  VERSION,
  TERRITORIES,
  TARGET_PAGES,
  buildTerritorialContentPreview,
  cityCoverage,
  findLocalBlock,
  replacement,
  sha256,
};
