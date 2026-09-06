"use strict";

const crypto = require("node:crypto");

const {
  validatedSaveBody,
  saveBody,
} = require("./quality-uplift-write-intent");

const VERSION = "mse-25.125ai-v1";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])])
    );
  }

  return value;
}

function digest(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex");
}

function sha256Text(value) {
  return crypto
    .createHash("sha256")
    .update(String(value ?? ""), "utf8")
    .digest("hex");
}

function normalizedType(block = {}) {
  return String(block.type || block.blockType || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.status = 409;
  error.details = details;
  throw error;
}

function requireSafePreview(preview = {}) {
  if (
    preview.version !== VERSION ||
    preview.operation !== "territorial-internal-link-preview" ||
    preview.readOnly !== true ||
    preview.writes !== false ||
    preview.publicWrites !== false ||
    preview.destructive !== false ||
    Number(preview.providerCalls || 0) !== 0 ||
    Number(preview.externalCalls || 0) !== 0
  ) {
    fail(
      "MSE_25_125AI_WRITE_INTENT_PREVIEW_INVALID",
      "Le preview territorial n'est pas une source read-only sûre."
    );
  }
}

function pageMap(currentPages = []) {
  return new Map(
    currentPages.map((page) => [
      String(page.slug || "").trim(),
      page,
    ])
  );
}

function requireSource(page, proposal) {
  const blocks = Array.isArray(page?.blocks) ? page.blocks : [];

  let block = null;

  if (proposal.sourceBlockId !== null &&
      proposal.sourceBlockId !== undefined) {
    block = blocks.find(
      (item) =>
        String(item?.id) === String(proposal.sourceBlockId)
    );
  }

  if (!block &&
      Number.isInteger(Number(proposal.sourceBlockIndex))) {
    block = blocks[Number(proposal.sourceBlockIndex)] || null;
  }

  if (!block) {
    fail(
      "MSE_25_125AI_SOURCE_BLOCK_MISSING",
      "Le bloc rich-text scellé n'existe plus.",
      {
        city: proposal.city,
        sourcePageSlug: proposal.sourcePageSlug,
        sourceBlockId: proposal.sourceBlockId,
      }
    );
  }

  if (!normalizedType(block).includes("rich-text")) {
    fail(
      "MSE_25_125AI_SOURCE_BLOCK_CHANGED",
      "Le bloc source n'est plus un rich_text.",
      {
        city: proposal.city,
        sourcePageSlug: proposal.sourcePageSlug,
        sourceBlockId: proposal.sourceBlockId,
      }
    );
  }

  return block;
}

function validateProposalAgainstCurrent(page, proposal) {
  const block = requireSource(page, proposal);
  const currentHtml = String(block.content?.html || "");

  const actualFingerprint = sha256Text(currentHtml);

  if (
    actualFingerprint !==
    String(proposal.sourceValueFingerprint || "")
  ) {
    fail(
      "MSE_25_125AI_SOURCE_FINGERPRINT_MISMATCH",
      "Le contenu source a changé depuis le preview territorial.",
      {
        city: proposal.city,
        sourcePageSlug: proposal.sourcePageSlug,
        expected: proposal.sourceValueFingerprint || null,
        actual: actualFingerprint,
      }
    );
  }

  const finalValue = String(proposal.finalValue || "");

  if (!finalValue.startsWith(currentHtml)) {
    fail(
      "MSE_25_125AI_FINAL_VALUE_INVALID",
      "Le HTML final ne prolonge pas exactement la source scellée.",
      {
        city: proposal.city,
        sourcePageSlug: proposal.sourcePageSlug,
      }
    );
  }

  const suffix = finalValue.slice(currentHtml.length);

  if (
    !suffix ||
    !suffix.includes(String(proposal.targetHref || "")) ||
    !suffix.includes(String(proposal.city || "")) ||
    !suffix.includes('data-seo-link="mse-25.125ai-v1"')
  ) {
    fail(
      "MSE_25_125AI_FINAL_VALUE_INVALID",
      "Le suffixe territorial ne contient pas les signaux approuvés.",
      {
        city: proposal.city,
        sourcePageSlug: proposal.sourcePageSlug,
      }
    );
  }

  return { block, currentHtml };
}

function buildTerritorialLinkWriteIntent({
  preview = {},
  currentPages = [],
} = {}) {
  requireSafePreview(preview);

  const pages = pageMap(currentPages);
  const intents = [];

  for (const proposal of preview.proposals || []) {
    if (proposal.status !== "sealed-candidate") continue;

    const sourcePage = pages.get(
      String(proposal.sourcePageSlug || "")
    );

    if (!sourcePage) {
      fail(
        "MSE_25_125AI_SOURCE_PAGE_MISSING",
        "La page source scellée est absente.",
        {
          city: proposal.city,
          sourcePageSlug: proposal.sourcePageSlug,
        }
      );
    }

    const page = clone(sourcePage);

    const { block, currentHtml } =
      validateProposalAgainstCurrent(page, proposal);

    const before = saveBody(page);

    block.content = {
      ...(block.content || {}),
      html: proposal.finalValue,
    };

    block.seo = {
      ...(block.seo || {}),
      internalLinkBy: VERSION,
      territorialCampaignId: preview.campaignId,
      territorialCity: proposal.city,
      purpose: "ranking-grid-territorial-internal-link",
    };

    const after = validatedSaveBody(page, {
      agencyId: preview.agencyId,
      siteSlug: preview.siteSlug,
      pageSlug: proposal.sourcePageSlug,
      city: proposal.city,
    });

    intents.push({
      key: `${preview.siteSlug}:${proposal.sourcePageSlug}:${proposal.city}`,
      agencyId: preview.agencyId,
      campaignId: preview.campaignId,
      siteSlug: preview.siteSlug,
      city: proposal.city,
      sourcePageSlug: proposal.sourcePageSlug,
      sourceBlockId: proposal.sourceBlockId,
      targetHref: proposal.targetHref,
      anchorText: proposal.anchorText,

      sourceValueFingerprint:
        proposal.sourceValueFingerprint,

      sourcePageSnapshotFingerprint:
        digest(before),

      targetPageSnapshotFingerprint:
        digest(after),

      exactChange: {
        beforeHtml: currentHtml,
        afterHtml: proposal.finalValue,
      },

      snapshot: {
        before,
        after,
      },

      persistence: {
        method: "PageBuilderPersistenceService.save",
        agencyId: preview.agencyId,
        pageSlug: proposal.sourcePageSlug,
        body: after,
      },
    });
  }

  const result = {
    version: VERSION,
    operation: "territorial-internal-link-write-intent",
    readOnly: true,
    writes: false,
    publicWrites: false,
    destructive: false,
    persistenceCallsPerformed: 0,
    providerCalls: 0,
    externalCalls: 0,

    agencyId: preview.agencyId,
    siteSlug: preview.siteSlug,
    campaignId: preview.campaignId,

    previewFingerprint: preview.previewFingerprint,

    summary: {
      proposalCount: (preview.proposals || []).length,
      sealedCandidateCount: (preview.proposals || [])
        .filter((row) => row.status === "sealed-candidate")
        .length,
      alreadyPresentCount: (preview.proposals || [])
        .filter((row) => row.status === "already-present")
        .length,
      manualReviewCount: (preview.proposals || [])
        .filter((row) => row.status === "manual-review")
        .length,
      touchedPageCount: intents.length,
      persistenceIntentCount: intents.length,
      persistenceCallsPerformed: 0,
    },

    intents,
  };

  return {
    ...result,
    writeIntentFingerprint: digest(result),
  };
}

module.exports = {
  VERSION,
  buildTerritorialLinkWriteIntent,
  digest,
  normalizedType,
  sha256Text,
};
