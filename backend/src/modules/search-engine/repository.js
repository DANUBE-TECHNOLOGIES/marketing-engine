"use strict";

function stringifyJson(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(stringifyJson).join(" ");
  if (typeof value === "object") return Object.values(value).map(stringifyJson).join(" ");
  return String(value);
}

function createSearchRepository(prisma) {
  async function loadDestinations() {
    const rows = await prisma.destination.findMany({
      include: {
        themes: { include: { theme: true } },
        travelTypes: { include: { travelType: true } },
        tags: { include: { tag: true } },
        faqs: true,
        sections: true,
      },
      orderBy: { name: "asc" },
    });
    return rows.map((row) => ({
      id: row.id, entityType: "destination", name: row.name, title: row.name,
      slug: row.slug, url: `/destinations/${row.slug}`, country: row.country,
      region: row.region, status: row.status, published: row.status === "published",
      tagline: row.tagline, summary: row.summary, seoTitle: row.seoTitle,
      seoDescription: row.seoDescription, highlights: row.highlights,
      audiences: row.audiences, latitude: row.latitude, longitude: row.longitude,
      themes: row.themes.map((item) => item.theme.name),
      themeSlugs: row.themes.map((item) => item.theme.slug),
      travelTypes: row.travelTypes.map((item) => item.travelType.name),
      travelTypeSlugs: row.travelTypes.map((item) => item.travelType.slug),
      tags: row.tags.map((item) => item.tag.name),
      tagSlugs: row.tags.map((item) => item.tag.slug),
      question: row.faqs.map((faq) => faq.question).join(" "),
      answer: row.faqs.map((faq) => faq.answer).join(" "),
      sectionText: row.sections.map((section) => `${section.title || ""} ${stringifyJson(section.content)}`).join(" "),
      updatedAt: row.updatedAt,
    }));
  }

  async function loadPages() {
    const rows = await prisma.agencySitePage.findMany({
      include: { site: true, sections: true },
      orderBy: { title: "asc" },
    });
    return rows.map((row) => ({
      id: row.id, entityType: "page", name: row.title, title: row.title,
      slug: row.slug, url: row.path, h1: row.h1, seoTitle: row.seoTitle,
      seoDescription: row.metaDescription, status: row.status,
      published: row.published, pageType: row.pageType, siteId: row.siteId,
      siteName: row.site.name, siteSlug: row.site.slug,
      sectionText: row.sections.map((section) => stringifyJson(section.jsonContent)).join(" "),
      updatedAt: row.updatedAt,
    }));
  }

  async function loadAll(entityTypes = ["destination", "page"]) {
    const loaders = [];
    if (entityTypes.includes("destination")) loaders.push(loadDestinations());
    if (entityTypes.includes("page")) loaders.push(loadPages());
    return (await Promise.all(loaders)).flat();
  }

  return { loadDestinations, loadPages, loadAll };
}

module.exports = { createSearchRepository, stringifyJson };
