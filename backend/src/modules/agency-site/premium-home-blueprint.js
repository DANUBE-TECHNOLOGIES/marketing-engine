"use strict";

function cloneJson(value, fallback = {}) {
  if (value === null || value === undefined) return fallback;
  return JSON.parse(JSON.stringify(value));
}

function blockTypeOf(item) {
  return String(item?.blockType || item?.sectionType || item?.jsonContent?.__builderType || "").replace(/--\d+$/, "").trim().toLowerCase();
}

function contentFamily(type) {
  const normalized = String(type || "").trim().toLowerCase();
  if (normalized === "cta" || normalized === "contact-cta") return "contact-cta";
  return normalized;
}

function contentOf(item) {
  if (item?.content && typeof item.content === "object") return item.content;
  if (item?.jsonContent && typeof item.jsonContent === "object") return item.jsonContent;
  return null;
}

function ordered(items = []) {
  return [...(Array.isArray(items) ? items : [])].sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
}

function queueByType(items = []) {
  const queues = new Map();
  for (const item of ordered(items)) {
    const type = contentFamily(blockTypeOf(item));
    if (!type) continue;
    if (!queues.has(type)) queues.set(type, []);
    queues.get(type).push(item);
  }
  return queues;
}

function shift(queueMap, type) {
  const queue = queueMap.get(contentFamily(type)) || [];
  return queue.shift() || null;
}

function typeSignature(items = []) {
  return ordered(items).map(blockTypeOf).filter(Boolean);
}

function familySignature(items = []) {
  return typeSignature(items).map(contentFamily);
}

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

// A premium blueprint describes presentation only. Local workflow state (status,
// version, SEO metadata and content) must not make an otherwise identical page
// look "non premium" after migration.
function visualSignature(items = []) {
  return ordered(items).map((item) => ({
    family: contentFamily(blockTypeOf(item)),
    settings: cloneJson(item?.settings, {}),
    visibleDesktop: item?.visibleDesktop !== false,
    visibleMobile: item?.visibleMobile !== false,
  }));
}

function isLegacyHomeCandidate(page) {
  const blocks = Array.isArray(page?.blocks) ? page.blocks : [];
  const slug = String(page?.slug || "");
  return (slug === "" || slug === "home") && blocks.length === 0;
}

function classifyPremiumHome({ referenceBlocks = [], targetBlocks = [] } = {}) {
  const referenceTypes = typeSignature(referenceBlocks);
  const targetTypes = typeSignature(targetBlocks);
  if (!targetTypes.length) return { status: "LEGACY_NO_V2", referenceTypes, targetTypes };

  const referenceFamilies = familySignature(referenceBlocks);
  const targetFamilies = familySignature(targetBlocks);
  const referenceVisual = stableJson(visualSignature(referenceBlocks));
  const targetVisual = stableJson(visualSignature(targetBlocks));
  if (sameArray(referenceFamilies, targetFamilies) && referenceVisual === targetVisual) {
    return { status: "PREMIUM_MATCH", referenceTypes, targetTypes };
  }

  const referenceCounts = new Map();
  const targetCounts = new Map();
  for (const type of referenceFamilies) referenceCounts.set(type, (referenceCounts.get(type) || 0) + 1);
  for (const type of targetFamilies) targetCounts.set(type, (targetCounts.get(type) || 0) + 1);
  const extraTypes = [];
  for (const [type, count] of targetCounts) {
    const extra = count - (referenceCounts.get(type) || 0);
    for (let index = 0; index < Math.max(0, extra); index += 1) extraTypes.push(type);
  }

  return {
    status: extraTypes.length ? "CUSTOM_V2" : "V2_STANDARD",
    referenceTypes,
    targetTypes,
    extraTypes,
    missingCount: Math.max(0, referenceTypes.length - targetTypes.length),
  };
}

function buildPremiumHomePlan({ referenceBlocks = [], targetBlocks = [], targetSections = [], generatedSections = [] } = {}) {
  const reference = ordered(referenceBlocks);
  if (!reference.length) return { ready: false, reason: "REFERENCE_HAS_NO_V2_BLOCKS", missingTypes: [], blocks: [] };

  const classification = classifyPremiumHome({ referenceBlocks, targetBlocks });
  if (classification.status === "PREMIUM_MATCH") {
    return { ready: false, reason: "PREMIUM_MATCH", missingTypes: [], blocks: [], classification };
  }
  if (classification.status === "CUSTOM_V2") {
    return { ready: false, reason: "CUSTOM_V2", missingTypes: [], blocks: [], classification };
  }

  const targetByType = queueByType(targetBlocks);
  const legacyByType = queueByType(targetSections);
  const generatedByType = queueByType(generatedSections);
  const missingTypes = [];
  const planned = [];

  for (const referenceBlock of reference) {
    const type = blockTypeOf(referenceBlock);
    if (!type) continue;
    const localSource = shift(targetByType, type) || shift(legacyByType, type) || shift(generatedByType, type);
    const localContent = contentOf(localSource);
    if (!localContent) {
      missingTypes.push(type);
      continue;
    }
    planned.push({
      blockType: type,
      name: referenceBlock.name || localSource?.name || null,
      content: cloneJson(localContent),
      settings: cloneJson(referenceBlock.settings, {}),
      seo: cloneJson(localSource?.seo, {}),
      displayOrder: Number(referenceBlock.displayOrder || planned.length),
      status: localSource?.status || "draft",
      visibleDesktop: referenceBlock.visibleDesktop !== false,
      visibleMobile: referenceBlock.visibleMobile !== false,
      version: Number(localSource?.version || 1),
    });
  }

  if (missingTypes.length) {
    return { ready: false, reason: "LOCAL_CONTENT_MISSING", missingTypes: [...new Set(missingTypes)], blocks: planned, classification };
  }

  return { ready: true, reason: "READY", missingTypes: [], blocks: planned, classification };
}

module.exports = { blockTypeOf, contentFamily, typeSignature, visualSignature, classifyPremiumHome, isLegacyHomeCandidate, buildPremiumHomePlan };
