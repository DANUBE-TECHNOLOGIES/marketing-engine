"use strict";

const PAGE_FIELDS = ["title", "slug", "path", "pageType", "menuTitle", "menuLocation", "displayOrder", "seoTitle", "metaDescription", "h1", "schemaType", "status", "published", "parentId"];

function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }

function createSnapshot(page) {
  if (!page?.id) throw new Error("Impossible de créer une version sans page valide.");
  const pageData = {};
  for (const field of PAGE_FIELDS) pageData[field] = page[field] ?? null;
  return {
    schemaVersion: 1,
    pageId: page.id,
    siteId: page.siteId,
    capturedAt: new Date().toISOString(),
    page: pageData,
    sections: (page.sections || []).map((section) => ({
      sectionType: section.sectionType,
      jsonContent: clone(section.jsonContent),
      displayOrder: section.displayOrder,
      status: section.status || "draft",
    })),
  };
}

function restoreData(snapshot) {
  if (!snapshot?.page || !Array.isArray(snapshot.sections)) throw new Error("Snapshot de publication invalide.");
  return { page: { ...snapshot.page }, sections: snapshot.sections.map((section) => ({ ...section })) };
}

module.exports = { PAGE_FIELDS, createSnapshot, restoreData };
