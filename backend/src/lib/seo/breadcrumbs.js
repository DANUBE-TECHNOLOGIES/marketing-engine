"use strict";

function buildBreadcrumbItems({ site, page }) {
  if (!site || !page) return [];
  const homePath = site.basePath || `/agence/${site.slug}`;
  const items = [{ name: "Accueil", path: homePath }];
  const currentPath = page.path || homePath;
  if (currentPath !== homePath) items.push({ name: page.title || page.h1 || "Page", path: currentPath });
  return items;
}

module.exports = { buildBreadcrumbItems };
