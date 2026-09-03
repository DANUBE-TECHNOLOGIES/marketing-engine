"use strict";

function clean(value) {
  return String(value || "").trim();
}

function normalizedBlockType(block = {}) {
  return String(block.blockType || block.type || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function normalizeFeatureIntroduction(page = {}) {
  const blocks = Array.isArray(page.optimizedBlocks) ? page.optimizedBlocks : [];
  const changes = Array.isArray(page.changes) ? page.changes : [];
  let normalizedCount = 0;

  const nextChanges = changes.map((change) => {
    const type = normalizedBlockType({ blockType: change?.blockType });
    if (type !== "features" || String(change?.field || "") !== "text") return change;

    const block = blocks.find((candidate) =>
      change?.blockId != null && String(candidate?.id) === String(change.blockId)
    ) || blocks.find((candidate) => normalizedBlockType(candidate) === "features");

    if (!block) return change;
    block.content = { ...(block.content || {}) };

    const currentIntroduction = clean(block.content.introduction);
    const generatedText = clean(change?.next);
    const legacyText = clean(block.content.text);

    if (!currentIntroduction && generatedText) {
      block.content.introduction = change.next;
    }

    if (legacyText && legacyText === generatedText) {
      delete block.content.text;
    }

    normalizedCount += 1;
    return {
      ...change,
      field: "introduction",
      previous: currentIntroduction,
      next: block.content.introduction || change.next,
      contractNormalized: true,
    };
  });

  page.changes = nextChanges;
  page.optimizedBlocks = blocks;
  return normalizedCount;
}

function normalizePlanForPageBuilderV2(plan = {}) {
  let normalizedFeatureChanges = 0;
  for (const page of plan.pages || []) {
    normalizedFeatureChanges += normalizeFeatureIntroduction(page);
  }
  plan.pageBuilderContract = {
    version: "v2",
    normalizedFeatureChanges,
  };
  return plan;
}

function installPageBuilderContractNormalization(MiniSiteSeoEnrichmentService) {
  const prototype = MiniSiteSeoEnrichmentService?.prototype;
  if (!prototype || prototype.__mse2530PageBuilderContractInstalled) return MiniSiteSeoEnrichmentService;
  prototype.__mse2530PageBuilderContractInstalled = true;

  const originalBuildAgency = prototype.buildAgencyContentOptimization;
  if (typeof originalBuildAgency !== "function") return MiniSiteSeoEnrichmentService;

  prototype.buildAgencyContentOptimization = async function buildAgencyContentOptimizationWithV2Contract(options = {}) {
    const plan = await originalBuildAgency.call(this, options);
    return normalizePlanForPageBuilderV2(plan);
  };

  return MiniSiteSeoEnrichmentService;
}

module.exports = {
  installPageBuilderContractNormalization,
  normalizeFeatureIntroduction,
  normalizePlanForPageBuilderV2,
  normalizedBlockType,
};
