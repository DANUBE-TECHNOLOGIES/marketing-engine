"use strict";

const crypto = require("node:crypto");
const {
  hasFlexiblePaymentBlock,
  normalizePaymentPolicy,
  planPaymentPlacements,
} = require("./payment-experience");

const PURPOSE = "flexible-payment-experience";
const SOURCE = "mse-25.32";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = canonicalize(value[key]);
    return result;
  }, {});
}

function fingerprint(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function resolveAgencyPaymentPolicy(site = {}, explicitPolicy) {
  const source = explicitPolicy === undefined ? site.paymentPolicy : explicitPolicy;
  return normalizePaymentPolicy(source || {});
}

function buildPaymentPlacementPreview({ site = {}, policy } = {}) {
  const normalizedPolicy = resolveAgencyPaymentPolicy(site, policy);
  const plan = planPaymentPlacements({ site, policy: normalizedPolicy });
  const previewFingerprint = fingerprint({
    version: SOURCE,
    siteId: site.id || null,
    siteSlug: site.slug || null,
    policy: normalizedPolicy,
    proposals: plan.proposals,
  });

  return {
    ...plan,
    policy: normalizedPolicy,
    fingerprint: previewFingerprint,
    readOnly: true,
    writes: false,
  };
}

function assertApplyAllowed({ preview, previewFingerprint, confirm }) {
  if (confirm !== true) {
    const error = new Error("Flexible payment apply requires confirm=true.");
    error.code = "FLEXIBLE_PAYMENT_CONFIRM_REQUIRED";
    error.status = 400;
    throw error;
  }
  if (!previewFingerprint || previewFingerprint !== preview.fingerprint) {
    const error = new Error("Flexible payment preview is stale or does not match the requested apply.");
    error.code = "FLEXIBLE_PAYMENT_PREVIEW_STALE";
    error.status = 409;
    throw error;
  }
}

function snapshotPage(page = {}) {
  return {
    id: page.id,
    siteId: page.siteId,
    slug: page.slug,
    title: page.title,
    status: page.status,
    published: page.published,
    blocks: (page.blocks || []).map((block) => ({
      id: block.id,
      blockType: block.blockType,
      name: block.name,
      content: block.content,
      settings: block.settings,
      seo: block.seo,
      displayOrder: block.displayOrder,
      status: block.status,
      visibleDesktop: block.visibleDesktop,
      visibleMobile: block.visibleMobile,
      version: block.version,
    })),
  };
}

async function applyPaymentPlacementPreview(repository, {
  site = {},
  policy,
  previewFingerprint,
  confirm = false,
  createdBy = SOURCE,
} = {}) {
  if (!repository?.prisma?.$transaction) {
    throw new TypeError("A repository with prisma.$transaction is required.");
  }

  const preview = buildPaymentPlacementPreview({ site, policy });
  assertApplyAllowed({ preview, previewFingerprint, confirm });

  const execute = async (client) => {
    const applied = [];
    const skipped = [...preview.skipped];

    for (const proposal of preview.proposals) {
      const page = await client.agencySitePage.findFirst({
        where: { siteId: site.id, slug: proposal.slug },
        include: {
          blocks: { orderBy: { displayOrder: "asc" } },
          versions: { orderBy: { version: "desc" }, take: 1 },
        },
      });

      if (!page || page.published !== true) {
        skipped.push({ slug: proposal.slug, reason: page ? "page-not-published" : "page-not-found-at-apply" });
        continue;
      }

      if (hasFlexiblePaymentBlock(page)) {
        skipped.push({ slug: proposal.slug, reason: "flexible-payment-block-already-present-at-apply" });
        continue;
      }

      const currentVersion = Number(page.versions?.[0]?.version || 0);
      const version = currentVersion + 1;
      const pageSnapshot = snapshotPage(page);

      await client.agencySitePageVersion.create({
        data: {
          pageId: page.id,
          version,
          snapshot: pageSnapshot,
          reason: `${SOURCE}: before flexible payment block apply`,
          createdBy,
        },
      });

      const highestOrder = (page.blocks || []).reduce(
        (max, block) => Math.max(max, Number(block.displayOrder || 0)),
        0
      );

      const block = await client.pageBlock.create({
        data: {
          pageId: page.id,
          blockType: "flexible_payment",
          name: proposal.placement === "compact" ? "Paiement en plusieurs fois" : "Paiement flexible",
          content: proposal.block.content,
          settings: { variant: proposal.placement },
          seo: {
            purpose: PURPOSE,
            source: SOURCE,
            previewFingerprint: preview.fingerprint,
          },
          displayOrder: highestOrder + 10,
          status: "published",
          visibleDesktop: true,
          visibleMobile: true,
        },
      });

      applied.push({
        pageId: page.id,
        slug: proposal.slug,
        placement: proposal.placement,
        blockId: block.id,
        rollbackVersion: version,
      });
    }

    return {
      version: SOURCE,
      fingerprint: preview.fingerprint,
      applied,
      skipped,
      summary: {
        proposed: preview.proposals.length,
        applied: applied.length,
        skipped: skipped.length,
      },
    };
  };

  return repository.prisma.$transaction((transaction) => execute(transaction));
}

async function rollbackPaymentPlacement(repository, {
  pageId,
  blockId,
  confirm = false,
} = {}) {
  if (confirm !== true) {
    const error = new Error("Flexible payment rollback requires confirm=true.");
    error.code = "FLEXIBLE_PAYMENT_ROLLBACK_CONFIRM_REQUIRED";
    error.status = 400;
    throw error;
  }
  if (!pageId || !blockId) {
    throw new TypeError("pageId and blockId are required for rollback.");
  }

  return repository.prisma.$transaction(async (client) => {
    const block = await client.pageBlock.findFirst({
      where: { id: blockId, pageId },
    });
    if (!block) return { rolledBack: false, reason: "block-not-found" };

    const seo = block.seo || {};
    if (seo.purpose !== PURPOSE || seo.source !== SOURCE) {
      const error = new Error("Refusing to rollback a block not created by MSE-25.32.");
      error.code = "FLEXIBLE_PAYMENT_ROLLBACK_FOREIGN_BLOCK";
      error.status = 409;
      throw error;
    }

    await client.pageBlock.delete({ where: { id: blockId } });
    return { rolledBack: true, pageId, blockId };
  });
}

module.exports = {
  PURPOSE,
  SOURCE,
  applyPaymentPlacementPreview,
  buildPaymentPlacementPreview,
  fingerprint,
  resolveAgencyPaymentPolicy,
  rollbackPaymentPlacement,
};
