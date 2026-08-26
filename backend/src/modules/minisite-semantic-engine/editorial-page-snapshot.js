"use strict";

function baseSectionType(section) {
  return String(section?.jsonContent?.__builderType || section?.sectionType || "").replace(/--\d+$/, "").trim().toLowerCase();
}
function text(value) { return typeof value === "string" ? value.trim() : ""; }
function firstText(object, keys) {
  for (const key of keys) { const value = text(object?.[key]); if (value) return value; }
  return "";
}
function findHero(page) {
  return (page?.sections || []).find((section) => ["hero", "agency-hero", "page-hero"].includes(baseSectionType(section))) || null;
}
function deriveIntroduction(page, hero) {
  const heroContent = hero?.jsonContent || {};
  const fromHero = firstText(heroContent, ["introduction", "intro", "description", "subtitle", "lead", "text"]);
  if (fromHero) return { value: fromHero, source: "hero" };
  for (const section of page?.sections || []) {
    const content = section?.jsonContent || {};
    const value = firstText(content, ["introduction", "intro", "description", "lead", "text", "body"]);
    if (value) return { value, source: baseSectionType(section) || "section" };
  }
  return { value: "", source: null };
}
function hasManualEditorialMarker(page) {
  const values = [...(page?.sections || []), ...(page?.blocks || [])];
  return values.some((item) => {
    const content = item?.jsonContent || item?.content || {};
    return content.manual === true || content.isManual === true || content.editorialSource === "manual" || content.source === "manual";
  });
}
function buildWebsiteDesignerEditorialSnapshot({ page, expectedSiteSlug, expectedPath } = {}) {
  if (!page || !page.id) throw new Error("MSE_25_56_WEBSITE_DESIGNER_PAGE_REQUIRED");
  const siteSlug = text(page?.site?.slug || expectedSiteSlug);
  const pagePath = text(page.path || expectedPath);
  if (!siteSlug || !pagePath) throw new Error("MSE_25_56_WEBSITE_DESIGNER_PAGE_IDENTITY_REQUIRED");
  if (expectedSiteSlug && siteSlug !== expectedSiteSlug) throw new Error("MSE_25_56_WEBSITE_DESIGNER_SITE_MISMATCH");
  if (expectedPath && pagePath !== expectedPath) throw new Error("MSE_25_56_WEBSITE_DESIGNER_PATH_MISMATCH");
  const hero = findHero(page);
  const introduction = deriveIntroduction(page, hero);
  return {
    exists: true,
    source: "WEBSITE_DESIGNER_V2",
    readOnly: true,
    writes: false,
    siteSlug,
    page: pagePath,
    pageIdentity: String(page.id),
    pageSlug: text(page.slug),
    status: text(page.status),
    published: page.published === true || page.status === "published",
    title: firstText(hero?.jsonContent || {}, ["title", "h1", "headline"]) || text(page.h1) || text(page.title),
    introduction: introduction.value,
    introductionSource: introduction.source,
    manualEditorialContent: hasManualEditorialMarker(page),
    sourceSectionCount: Array.isArray(page.sections) ? page.sections.length : 0,
    sourceBlockCount: Array.isArray(page.blocks) ? page.blocks.length : 0,
  };
}
module.exports = { buildWebsiteDesignerEditorialSnapshot, baseSectionType, deriveIntroduction, hasManualEditorialMarker };
