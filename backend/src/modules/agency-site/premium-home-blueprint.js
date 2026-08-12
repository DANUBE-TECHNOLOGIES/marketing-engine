"use strict";

function cloneJson(value, fallback = {}) {
  if (value === null || value === undefined) return fallback;
  return JSON.parse(JSON.stringify(value));
}

function blockTypeOf(item) {
  return String(item?.blockType || item?.sectionType || item?.jsonContent?.__builderType || "").replace(/--\d+$/, "").trim().toLowerCase();
}

function contentOf(item) {
  if (item?.content && typeof item.content === "object") return item.content;
  if (item?.jsonContent && typeof item.jsonContent === "object") return item.jsonContent;
  return null;
}

function queueByType(items = []) {
  const queues = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const type = blockTypeOf(item);
    if (!type) continue;
    if (!queues.has(type)) queues.set(type, []);
    queues.get(type).push(item);
  }
  return queues;
}

function shift(queueMap, type) {
  const queue = queueMap.get(type) || [];
  return queue.shift() || null;
}

function isLegacyHomeCandidate(page) {
  const blocks = Array.isArray(page?.blocks) ? page.blocks : [];
  const slug = String(page?.slug || "");
  return (slug === "" || slug === "home") && blocks.length === 0;
}

function buildPremiumHomePlan({ referenceBlocks = [], targetBlocks = [], targetSections = [], generatedSections = [] } = {}) {
  const reference = [...referenceBlocks].sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
  if (!reference.length) return { ready: false, reason: "REFERENCE_HAS_NO_V2_BLOCKS", missingTypes: [], blocks: [] };
  if (targetBlocks.length) return { ready: false, reason: "TARGET_ALREADY_V2", missingTypes: [], blocks: [] };

  const legacyByType = queueByType(targetSections);
  const generatedByType = queueByType(generatedSections);
  const missingTypes = [];
  const planned = [];

  for (const referenceBlock of reference) {
    const type = blockTypeOf(referenceBlock);
    if (!type) continue;
    const localSource = shift(legacyByType, type) || shift(generatedByType, type);
    const localContent = contentOf(localSource);
    if (!localContent) {
      missingTypes.push(type);
      continue;
    }
    planned.push({
      blockType: type,
      name: referenceBlock.name || null,
      content: cloneJson(localContent),
      settings: cloneJson(referenceBlock.settings, {}),
      seo: cloneJson(localSource?.seo, {}),
      displayOrder: Number(referenceBlock.displayOrder || planned.length),
      status: localSource?.status || "draft",
      visibleDesktop: referenceBlock.visibleDesktop !== false,
      visibleMobile: referenceBlock.visibleMobile !== false,
      version: 1,
    });
  }

  if (missingTypes.length) {
    return { ready: false, reason: "LOCAL_CONTENT_MISSING", missingTypes: [...new Set(missingTypes)], blocks: planned };
  }

  return { ready: true, reason: "READY", missingTypes: [], blocks: planned };
}

module.exports = { blockTypeOf, isLegacyHomeCandidate, buildPremiumHomePlan };
