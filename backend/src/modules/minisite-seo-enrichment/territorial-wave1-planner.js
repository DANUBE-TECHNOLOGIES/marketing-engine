"use strict";

const crypto = require("node:crypto");

const {
  buildTerritorialContentPreview,
} = require("./territorial-content-planner");

const {
  buildTerritorialLinkPreview,
} = require("./territorial-link-planner");

const VERSION = "mse-25.125ai-wave1-v1";

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(String(value ?? ""), "utf8")
    .digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function pageBySlug(site, slug) {
  return (site.pages || []).find(
    (page) => String(page.slug || "") === String(slug)
  ) || null;
}

function blockById(page, blockId) {
  return (page.blocks || []).find(
    (block) => String(block.id || "") === String(blockId)
  ) || null;
}

/*
 * Replace only the original leading territorial paragraph.
 *
 * Anything appended afterwards by another SEO module is preserved.
 * This is especially important for services, where MSE-25.47 already
 * appended the commitments link to the same rich_text block.
 */
function replaceLeadingParagraph({
  currentHtml,
  replacementHtml,
}) {
  const source = String(currentHtml || "");
  const replacement = String(replacementHtml || "");

  const closeIndex =
    source.toLowerCase().indexOf("</p>");

  if (closeIndex < 0) {
    const error = new Error(
      "Unable to locate leading territorial paragraph."
    );
    error.code = "MSE_25_125AI_LEADING_PARAGRAPH_MISSING";
    throw error;
  }

  if (
    !replacement.trim().startsWith("<p") ||
    !replacement.toLowerCase().includes("</p>")
  ) {
    const error = new Error(
      "Replacement territorial HTML is not a paragraph."
    );
    error.code = "MSE_25_125AI_REPLACEMENT_INVALID";
    throw error;
  }

  const suffix =
    source.slice(closeIndex + 4);

  return (
    replacement.trim() +
    (suffix.trim() ? "\n" + suffix.trimStart() : "")
  );
}

function linkBefore(proposal) {
  return String(
    proposal.beforeHtml ??
    proposal.before?.html ??
    proposal.sourceValue ??
    ""
  );
}

function linkAfter(proposal) {
  return String(
    proposal.afterHtml ??
    proposal.after?.html ??
    proposal.finalValue ??
    ""
  );
}

function linkAddition(proposal) {
  const before = linkBefore(proposal);
  const after = linkAfter(proposal);

  if (!before || !after) {
    const error = new Error(
      `Missing territorial link before/after for ${proposal.city || "unknown"}.`
    );
    error.code = "MSE_25_125AI_LINK_PREVIEW_INCOMPLETE";
    throw error;
  }

  if (!after.startsWith(before)) {
    const error = new Error(
      `Territorial link preview is not append-only for ${proposal.city || "unknown"}.`
    );
    error.code = "MSE_25_125AI_LINK_NOT_APPEND_ONLY";
    throw error;
  }

  const addition =
    after.slice(before.length);

  if (
    !addition.includes('data-seo-link="mse-25.125ai-v1"')
  ) {
    const error = new Error(
      `Territorial marker missing for ${proposal.city || "unknown"}.`
    );
    error.code = "MSE_25_125AI_LINK_MARKER_MISSING";
    throw error;
  }

  return addition;
}

function buildTerritorialWave1Preview({
  site,
  campaignId = 11,
} = {}) {
  if (
    Number(site?.agencyId || site?.agency?.id) !== 6 ||
    String(site?.slug || "") !==
      "ambassade-fram-mondescale-bois-colombes" ||
    Number(campaignId) !== 11
  ) {
    const error = new Error(
      "Wave 1 unified preview restricted to Bois-Colombes campaign 11."
    );
    error.code = "MSE_25_125AI_WAVE1_SCOPE_MISMATCH";
    throw error;
  }

  const contentPreview =
    buildTerritorialContentPreview({
      site,
      campaignId,
    });

  const linkPreview =
    buildTerritorialLinkPreview({
      site,
      campaignId,
    });

  const contentCandidates =
    (contentPreview.proposals || []).filter(
      (row) => row.status === "sealed-candidate"
    );

  const linkCandidates =
    (linkPreview.proposals || []).filter(
      (row) => row.status === "sealed-candidate"
    );

  if (contentCandidates.length !== 4) {
    const error = new Error(
      `Expected 4 content candidates, got ${contentCandidates.length}.`
    );
    error.code = "MSE_25_125AI_CONTENT_CANDIDATE_COUNT";
    throw error;
  }

  if (linkCandidates.length !== 4) {
    const error = new Error(
      `Expected 4 link candidates, got ${linkCandidates.length}.`
    );
    error.code = "MSE_25_125AI_LINK_CANDIDATE_COUNT";
    throw error;
  }

  /*
   * One working copy for the whole Wave 1 transformation.
   * Both content and link effects are applied to this exact snapshot.
   */
  const workingPages = new Map();

  for (const slug of [
    "agence",
    "services",
    "destinations",
    "engagements",
  ]) {
    const sourcePage =
      pageBySlug(site, slug);

    if (!sourcePage) {
      const error = new Error(
        `Page ${slug} missing.`
      );
      error.code = "MSE_25_125AI_PAGE_MISSING";
      throw error;
    }

    workingPages.set(
      slug,
      {
        before: clone(sourcePage),
        after: clone(sourcePage),
        effects: [],
      }
    );
  }

  /*
   * Phase A: service-area content.
   */
  for (const proposal of contentCandidates) {
    const work =
      workingPages.get(proposal.pageSlug);

    if (!work) {
      throw new Error(
        `Unexpected content page ${proposal.pageSlug}.`
      );
    }

    const beforeBlock =
      blockById(
        work.before,
        proposal.sourceBlockId
      );

    const afterBlock =
      blockById(
        work.after,
        proposal.sourceBlockId
      );

    if (!beforeBlock || !afterBlock) {
      const error = new Error(
        `Content block ${proposal.sourceBlockId} missing on ${proposal.pageSlug}.`
      );
      error.code = "MSE_25_125AI_CONTENT_BLOCK_MISSING";
      throw error;
    }

    const currentHtml =
      String(beforeBlock.content?.html || "");

    if (
      sha256(currentHtml) !==
      proposal.sourceValueFingerprint
    ) {
      const error = new Error(
        `Stale territorial content fingerprint on ${proposal.pageSlug}.`
      );
      error.code = "MSE_25_125AI_CONTENT_STALE";
      throw error;
    }

    const finalHtml =
      replaceLeadingParagraph({
        currentHtml,
        replacementHtml:
          proposal.after.html,
      });

    afterBlock.content = {
      ...(afterBlock.content || {}),
      title:
        proposal.after.title ||
        afterBlock.content?.title,
      html:
        finalHtml,
    };

    afterBlock.seo = {
      ...(afterBlock.seo || {}),
      territorialContentBy:
        "mse-25.125ai-v1",
      territorialCampaignId:
        11,
    };

    work.effects.push({
      type:
        "service_area_relevance",
      pageSlug:
        proposal.pageSlug,
      blockId:
        proposal.sourceBlockId,
      sourceFingerprint:
        proposal.sourceValueFingerprint,
    });
  }

  /*
   * Phase B: territorial internal links.
   *
   * Important: when content and link touch the same block,
   * the link is appended to the already transformed HTML,
   * not to the obsolete original HTML.
   */
  for (const proposal of linkCandidates) {
    const slug =
      proposal.sourcePageSlug;

    const work =
      workingPages.get(slug);

    if (!work) {
      const error = new Error(
        `Unexpected link page ${slug}.`
      );
      error.code = "MSE_25_125AI_LINK_PAGE_MISSING";
      throw error;
    }

    const originalBlock =
      blockById(
        work.before,
        proposal.sourceBlockId
      );

    const transformedBlock =
      blockById(
        work.after,
        proposal.sourceBlockId
      );

    if (!originalBlock || !transformedBlock) {
      const error = new Error(
        `Link block ${proposal.sourceBlockId} missing on ${slug}.`
      );
      error.code = "MSE_25_125AI_LINK_BLOCK_MISSING";
      throw error;
    }

    /*
     * Validate the link planner against the untouched source.
     */
    const originalHtml =
      String(originalBlock.content?.html || "");

    if (
      linkBefore(proposal) !== originalHtml
    ) {
      const error = new Error(
        `Link source snapshot mismatch on ${slug}.`
      );
      error.code = "MSE_25_125AI_LINK_SOURCE_MISMATCH";
      throw error;
    }

    const addition =
      linkAddition(proposal);

    const currentTransformedHtml =
      String(
        transformedBlock.content?.html || ""
      );

    if (
      currentTransformedHtml.includes(
        'data-seo-link="mse-25.125ai-v1"'
      )
    ) {
      const error = new Error(
        `Territorial link already present on ${slug}.`
      );
      error.code = "MSE_25_125AI_LINK_ALREADY_PRESENT";
      throw error;
    }

    transformedBlock.content = {
      ...(transformedBlock.content || {}),
      html:
        currentTransformedHtml +
        addition,
    };

    transformedBlock.seo = {
      ...(transformedBlock.seo || {}),
      territorialLinkBy:
        "mse-25.125ai-v1",
      territorialCampaignId:
        11,
    };

    work.effects.push({
      type:
        "internal_linking",
      city:
        proposal.city,
      pageSlug:
        slug,
      blockId:
        proposal.sourceBlockId,
      anchorText:
        proposal.anchorText,
      targetHref:
        proposal.targetHref,
    });
  }

  const pageIntents = [];

  for (const [
    slug,
    work,
  ] of workingPages.entries()) {
    const touchedBlockIds =
      Array.from(
        new Set(
          work.effects.map(
            (effect) => effect.blockId
          )
        )
      );

    pageIntents.push({
      pageSlug:
        slug,

      pageId:
        work.before.id,

      effectCount:
        work.effects.length,

      touchedBlockCount:
        touchedBlockIds.length,

      touchedBlockIds,

      effects:
        work.effects,

      beforeSnapshotFingerprint:
        sha256(
          JSON.stringify(work.before)
        ),

      afterSnapshotFingerprint:
        sha256(
          JSON.stringify(work.after)
        ),

      before:
        work.before,

      after:
        work.after,
    });
  }

  const allTouchedBlocks =
    new Set(
      pageIntents.flatMap(
        (page) => page.touchedBlockIds
      )
    );

  return {
    version:
      VERSION,

    operation:
      "territorial-wave1-unified-preview",

    readOnly:
      true,

    writes:
      false,

    publicWrites:
      false,

    destructive:
      false,

    persistenceCallsPerformed:
      0,

    providerCalls:
      0,

    externalCalls:
      0,

    agencyId:
      6,

    campaignId:
      11,

    siteSlug:
      site.slug,

    summary: {
      pageWriteCount:
        pageIntents.length,

      semanticEffectCount:
        pageIntents.reduce(
          (sum, page) =>
            sum + page.effectCount,
          0
        ),

      touchedBlockCount:
        allTouchedBlocks.size,

      serviceAreaEffectCount:
        pageIntents
          .flatMap((page) => page.effects)
          .filter(
            (effect) =>
              effect.type ===
              "service_area_relevance"
          ).length,

      internalLinkEffectCount:
        pageIntents
          .flatMap((page) => page.effects)
          .filter(
            (effect) =>
              effect.type ===
              "internal_linking"
          ).length,

      persistenceCallsPerformed:
        0,
    },

    pageIntents,
  };
}

module.exports = {
  VERSION,
  buildTerritorialWave1Preview,
  replaceLeadingParagraph,
  sha256,
};
