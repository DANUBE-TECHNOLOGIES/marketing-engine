"use strict";

const crypto = require("node:crypto");

const VERSION = "mse-25.125ai-v1";

const BOIS_COLOMBES = Object.freeze({
  agencyId: 6,
  siteSlug: "ambassade-fram-mondescale-bois-colombes",
  campaignId: 11,
  targetHref: "/agence/ambassade-fram-mondescale-bois-colombes",
  territories: Object.freeze([
    {
      city: "Levallois-Perret",
      sourcePageSlug: "services",
      anchorText: "agence de voyages proche de Levallois-Perret",
    },
    {
      city: "Asnières-sur-Seine",
      sourcePageSlug: "agence",
      anchorText: "conseils voyage pour les voyageurs d’Asnières-sur-Seine",
    },
    {
      city: "Clichy",
      sourcePageSlug: "destinations",
      anchorText: "accompagnement voyage depuis Clichy",
    },
    {
      city: "Neuilly-sur-Seine",
      sourcePageSlug: "engagements",
      anchorText: "conseiller voyage pour les voyageurs de Neuilly-sur-Seine",
    },
  ]),
});

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

function richTextBlocks(page = {}) {
  return (page.blocks || [])
    .map((block, index) => ({ block, index }))
    .filter(({ block }) =>
      normalizeType(block).includes("rich-text") &&
      typeof block?.content?.html === "string"
    );
}

function chooseSourceBlock(page = {}) {
  const rows = richTextBlocks(page);

  if (!rows.length) return null;

  return rows
    .map(({ block, index }) => {
      const html = String(block.content.html || "").toLowerCase();

      let score = 100;

      if (html.includes("voyage")) score += 20;
      if (html.includes("conseil")) score += 15;
      if (html.includes("accompagn")) score += 15;
      if (html.includes("service")) score += 10;

      if (block?.seo?.generatedBy === "mse-25.40") score -= 30;

      return { block, index, score };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)[0];
}

function sentenceFor(city, href, anchor) {
  const texts = {
    "Levallois-Perret":
      `Notre équipe de Bois-Colombes accompagne également les voyageurs de Levallois-Perret : découvrez notre <a href="${href}">${anchor}</a> pour préparer votre projet avec un interlocuteur en agence.`,

    "Asnières-sur-Seine":
      `Vous habitez Asnières-sur-Seine ? Nos conseillers vous accueillent à Bois-Colombes et vous proposent des <a href="${href}">${anchor}</a>, du choix de la destination au suivi de votre réservation.`,

    "Clichy":
      `Pour les voyageurs de Clichy et des communes voisines, notre équipe propose un <a href="${href}">${anchor}</a> avec un suivi assuré par notre agence de Bois-Colombes.`,

    "Neuilly-sur-Seine":
      `Les voyageurs de Neuilly-sur-Seine peuvent également bénéficier d’un <a href="${href}">${anchor}</a> auprès de notre équipe installée à Bois-Colombes.`,
  };

  return texts[city] || null;
}

function hasTerritorialSignal(html, city, href) {
  const value = String(html || "").toLowerCase();

  return (
    value.includes(city.toLowerCase()) &&
    value.includes(String(href).toLowerCase())
  );
}

function buildTerritorialLinkPreview({
  site = {},
  campaignId = 11,
} = {}) {
  if (
    Number(site.agencyId || site.agency?.id) !== BOIS_COLOMBES.agencyId ||
    String(site.slug || "") !== BOIS_COLOMBES.siteSlug ||
    Number(campaignId) !== BOIS_COLOMBES.campaignId
  ) {
    const error = new Error(
      "MSE-25.125AI territorial preview is restricted to calibrated Bois-Colombes Wave 1."
    );
    error.code = "MSE_25_125AI_SCOPE_MISMATCH";
    throw error;
  }

  const proposals = [];

  for (const territory of BOIS_COLOMBES.territories) {
    const page = (site.pages || []).find(
      (row) => String(row.slug || "") === territory.sourcePageSlug
    );

    if (!page) {
      proposals.push({
        ...territory,
        status: "manual-review",
        reason: "source-page-missing",
      });
      continue;
    }

    const source = chooseSourceBlock(page);

    if (!source) {
      proposals.push({
        ...territory,
        status: "manual-review",
        reason: "rich-text-source-missing",
      });
      continue;
    }

    const sourceHtml = String(source.block.content.html || "");

    if (
      hasTerritorialSignal(
        sourceHtml,
        territory.city,
        BOIS_COLOMBES.targetHref
      )
    ) {
      proposals.push({
        ...territory,
        status: "already-present",
        targetHref: BOIS_COLOMBES.targetHref,
        sourceBlockId: source.block.id ?? null,
      });
      continue;
    }

    const sentence = sentenceFor(
      territory.city,
      BOIS_COLOMBES.targetHref,
      territory.anchorText
    );

    proposals.push({
      ...territory,
      status: "sealed-candidate",
      targetHref: BOIS_COLOMBES.targetHref,
      sourceBlockId: source.block.id ?? null,
      sourceBlockIndex: source.index,
      sourceValueFingerprint: sha256(sourceHtml),
      sentence,
      beforeHtml: sourceHtml,
      finalValue:
        sourceHtml +
        `${sourceHtml ? "\n" : ""}` +
        `<p data-seo-link="${VERSION}" data-territory="${territory.city}">${sentence}</p>`,
    });
  }

  for (const proposal of proposals) {
    if (proposal.status === "sealed-candidate") {
      proposal.afterHtml = proposal.finalValue;
    }
  }

  const result = {
    version: VERSION,
    operation: "territorial-internal-link-preview",
    readOnly: true,
    writes: false,
    destructive: false,
    publicWrites: false,
    providerCalls: 0,
    externalCalls: 0,
    agencyId: BOIS_COLOMBES.agencyId,
    siteSlug: BOIS_COLOMBES.siteSlug,
    campaignId: BOIS_COLOMBES.campaignId,
    targetHref: BOIS_COLOMBES.targetHref,
    policy: {
      noDoorwayPages: true,
      noFakeLocations: true,
      noAutomaticPublication: true,
      existingPagesOnly: true,
      richTextOnly: true,
      fingerprintRequired: true,
    },
    proposals,
    summary: {
      territoryCount: proposals.length,
      sealedCandidateCount: proposals.filter(
        (row) => row.status === "sealed-candidate"
      ).length,
      alreadyPresentCount: proposals.filter(
        (row) => row.status === "already-present"
      ).length,
      manualReviewCount: proposals.filter(
        (row) => row.status === "manual-review"
      ).length,
    },
  };

  return {
    ...result,
    previewFingerprint: sha256(JSON.stringify(result)),
  };
}

module.exports = {
  VERSION,
  BOIS_COLOMBES,
  buildTerritorialLinkPreview,
  chooseSourceBlock,
  hasTerritorialSignal,
  normalizeType,
  richTextBlocks,
  sentenceFor,
  sha256,
};
