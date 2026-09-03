"use strict";

function clean(value) { return String(value || "").trim(); }
function pageHref(page, site) {
  if (page?.path) return page.path;
  const base = clean(site?.basePath) || `/agence/${clean(site?.slug)}`;
  return page?.slug ? `${base}/${page.slug}` : base;
}

function buildNavigation({ site, pages = [], includeDrafts = false } = {}) {
  if (!site?.slug) throw new Error("A site with a slug is required");
  const eligible = pages
    .filter((page) => includeDrafts || (page.status === "published" && page.published === true))
    .slice()
    .sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0) || clean(a.menuTitle || a.title).localeCompare(clean(b.menuTitle || b.title), "fr"));

  const byId = new Map(eligible.map((page) => [page.id, { ...page, children: [] }]));
  const roots = [];
  for (const page of byId.values()) {
    if (page.parentId && byId.has(page.parentId)) byId.get(page.parentId).children.push(page);
    else roots.push(page);
  }

  const serialize = (page) => ({
    id: page.id,
    title: clean(page.menuTitle || page.title),
    href: pageHref(page, site),
    pageType: page.pageType,
    location: page.menuLocation,
    order: Number(page.displayOrder) || 0,
    children: page.children.map(serialize),
  });

  const tree = roots.map(serialize);
  const locations = {};
  for (const page of eligible) {
    const key = clean(page.menuLocation) || "main";
    if (!locations[key]) locations[key] = [];
    locations[key].push({ id: page.id, title: clean(page.menuTitle || page.title), href: pageHref(page, site), pageType: page.pageType, order: Number(page.displayOrder) || 0 });
  }

  return { version: "1.0", site: { id: site.id, slug: site.slug, name: site.name }, tree, locations, count: eligible.length };
}

function buildBreadcrumbForPage(page, pages = [], site) {
  if (!page) return [];
  const byId = new Map(pages.map((item) => [item.id, item]));
  const chain = [];
  const visited = new Set();
  let current = page;
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    chain.unshift({ name: clean(current.menuTitle || current.title), href: pageHref(current, site) });
    current = current.parentId ? byId.get(current.parentId) : null;
  }
  chain.unshift({ name: "Accueil", href: clean(site?.basePath) || `/agence/${clean(site?.slug)}` });
  return chain;
}

module.exports = { buildNavigation, buildBreadcrumbForPage, pageHref };
