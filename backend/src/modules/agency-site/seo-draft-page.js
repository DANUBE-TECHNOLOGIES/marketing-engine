"use strict";

function clean(value) {
  return String(value || "").trim();
}

function slugify(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function metaDescription(brief) {
  const angle = clean(brief?.angle);
  const keyword = clean(brief?.keyword);
  const base = angle || (keyword ? `Informations locales et conseils autour de ${keyword}.` : "Contenu local à compléter et valider par l'agence.");
  return base.slice(0, 155);
}

function buildSeoDraftPageDefinition(brief, input = {}) {
  const h1 = clean(brief?.proposedH1 || brief?.keyword);
  const keyword = clean(brief?.keyword || h1);
  const slug = slugify(input.slug || keyword || h1);

  if (!h1 || !slug) {
    const error = new Error("Le brief SEO doit fournir un H1 et un slug exploitables.");
    error.statusCode = 400;
    error.code = "SEO_DRAFT_PAGE_INVALID_BRIEF";
    throw error;
  }

  return {
    slug,
    title: h1,
    path: `/${slug}`,
    pageType: "seo-local",
    menuTitle: h1.slice(0, 80),
    menu: "none",
    order: Number.isInteger(Number(input.order)) ? Number(input.order) : 900,
    seoTitle: clean(input.seoTitle || h1).slice(0, 70),
    metaDescription: clean(input.metaDescription || metaDescription(brief)),
    h1,
    schemaType: "WebPage",
    status: "draft",
    published: false,
  };
}

module.exports = { clean, slugify, buildSeoDraftPageDefinition };
