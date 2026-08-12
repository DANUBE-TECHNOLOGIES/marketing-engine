"use strict";

const AgencySiteRepository = require("./repository");
const { analyzeUniqueness } = require("./content-uniqueness");
const { buildLocalEvidence } = require("./local-evidence");
const { buildLocalRewriteProposal } = require("./local-rewrite");

function normalizeDraftBlock(block, index) {
  return {
    id: String(block?.id || `draft-block-${index}`),
    blockType: String(block?.type || block?.blockType || "rich_text"),
    name: String(block?.name || block?.type || block?.blockType || `Bloc ${index + 1}`),
    displayOrder: Number.isFinite(Number(block?.position ?? block?.displayOrder))
      ? Number(block?.position ?? block?.displayOrder)
      : index,
    content: block?.content && typeof block.content === "object" ? block.content : {},
  };
}

function buildDraftTarget(persistedPage, draftPage) {
  if (!draftPage || typeof draftPage !== "object") return persistedPage;
  const hasDesignerBlocks = Array.isArray(draftPage.blocks);
  const blocks = hasDesignerBlocks
    ? draftPage.blocks.map(normalizeDraftBlock)
    : persistedPage.blocks;
  return {
    ...persistedPage,
    title: draftPage.title ?? persistedPage.title,
    seoTitle: draftPage.seoTitle ?? persistedPage.seoTitle,
    metaDescription: draftPage.seoDescription ?? draftPage.metaDescription ?? persistedPage.metaDescription,
    sections: hasDesignerBlocks ? [] : persistedPage.sections,
    blocks,
  };
}

function buildRewriteImpact(currentAudit, projectedAudit, currentInsight, projectedInsight) {
  const currentBlockSimilarity = Number(currentInsight?.highestSimilarity || 0);
  const projectedBlockSimilarity = Number(projectedInsight?.highestSimilarity || 0);
  const currentPageSimilarity = Number(currentAudit?.highestSimilarity || 0);
  const projectedPageSimilarity = Number(projectedAudit?.highestSimilarity || 0);
  const currentBlockScore = Number(currentInsight?.score ?? 100);
  const projectedBlockScore = Number(projectedInsight?.score ?? 100);
  const currentPageScore = Number(currentAudit?.score ?? 100);
  const projectedPageScore = Number(projectedAudit?.score ?? 100);
  const blockSimilarityGain = Number((currentBlockSimilarity - projectedBlockSimilarity).toFixed(3));
  const pageSimilarityGain = Number((currentPageSimilarity - projectedPageSimilarity).toFixed(3));
  const blockScoreGain = projectedBlockScore - currentBlockScore;
  const pageScoreGain = projectedPageScore - currentPageScore;
  const blockImproved = blockSimilarityGain > 0;
  const pageDidNotRegress = projectedPageSimilarity <= currentPageSimilarity;
  const safeToApply = blockImproved && pageDidNotRegress;

  return {
    version: "1.0",
    safeToApply,
    blockImproved,
    pageDidNotRegress,
    block: {
      similarityBefore: currentBlockSimilarity,
      similarityAfter: projectedBlockSimilarity,
      similarityGain: blockSimilarityGain,
      scoreBefore: currentBlockScore,
      scoreAfter: projectedBlockScore,
      scoreGain: blockScoreGain,
    },
    page: {
      similarityBefore: currentPageSimilarity,
      similarityAfter: projectedPageSimilarity,
      similarityGain: pageSimilarityGain,
      scoreBefore: currentPageScore,
      scoreAfter: projectedPageScore,
      scoreGain: pageScoreGain,
      readyBefore: Boolean(currentAudit?.ready),
      readyAfter: Boolean(projectedAudit?.ready),
      severityBefore: currentAudit?.severity || "ok",
      severityAfter: projectedAudit?.severity || "ok",
    },
    reason: safeToApply
      ? "MEASURABLE_UNIQUENESS_GAIN"
      : !blockImproved
        ? "NO_MEASURABLE_BLOCK_GAIN"
        : "PAGE_UNIQUENESS_REGRESSION",
  };
}

async function loadContext({ prisma, tenantId, agencyId, slug, draftPage }) {
  const repo = new AgencySiteRepository(prisma, tenantId);
  const persistedPage = await repo.findPage(agencyId, slug);
  if (!persistedPage) {
    const error = new Error(`Page ${slug || "accueil"} introuvable`);
    error.statusCode = 404;
    error.code = "AGENCY_SITE_PAGE_NOT_FOUND";
    throw error;
  }
  const target = buildDraftTarget(persistedPage, draftPage);
  const candidates = await repo.listNetworkPages(persistedPage.id);
  const localEvidence = buildLocalEvidence(persistedPage);
  const audit = analyzeUniqueness(target, candidates);
  return { persistedPage, target, candidates, localEvidence, audit };
}

async function auditDraft(args) {
  const context = await loadContext(args);
  return { ...context.audit, localEvidence: context.localEvidence, draft: Boolean(args.draftPage) };
}

async function proposeLocalRewrite(args) {
  const context = await loadContext(args);
  const blockId = String(args.blockId || "");
  const block = (context.target.blocks || []).find((item) => String(item.id || "") === blockId);
  if (!block) {
    const error = new Error("Le bloc sélectionné est introuvable dans le brouillon.");
    error.statusCode = 404;
    error.code = "LOCAL_REWRITE_BLOCK_NOT_FOUND";
    throw error;
  }
  const insight = (context.audit.blockInsights || []).find((item) => String(item.blockId || "") === blockId) || null;
  const proposal = buildLocalRewriteProposal({
    block: { ...block, type: block.blockType },
    localEvidence: context.localEvidence,
    insight,
  });
  if (!proposal.eligible) {
    return { ...proposal, currentAudit: context.audit, localEvidence: context.localEvidence };
  }

  const patchedTarget = {
    ...context.target,
    blocks: (context.target.blocks || []).map((item) =>
      String(item.id || "") === blockId ? { ...item, content: proposal.content } : item
    ),
  };
  const projectedAudit = analyzeUniqueness(patchedTarget, context.candidates);
  const projectedInsight = (projectedAudit.blockInsights || []).find((item) => String(item.blockId || "") === blockId) || null;
  const impact = buildRewriteImpact(context.audit, projectedAudit, insight, projectedInsight);

  return {
    ...proposal,
    currentSimilarity: insight?.highestSimilarity ?? 0,
    projectedSimilarity: projectedInsight?.highestSimilarity ?? 0,
    currentScore: insight?.score ?? 100,
    projectedScore: projectedInsight?.score ?? 100,
    impact,
    projectedAudit: {
      score: projectedAudit.score,
      ready: projectedAudit.ready,
      severity: projectedAudit.severity,
      highestSimilarity: projectedAudit.highestSimilarity,
      blockInsight: projectedInsight,
    },
  };
}

module.exports = { auditDraft, proposeLocalRewrite, buildDraftTarget, normalizeDraftBlock, buildRewriteImpact };
