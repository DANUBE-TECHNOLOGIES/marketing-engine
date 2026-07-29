function flattenJson(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(flattenJson).join(" ");
  if (typeof value === "object") return Object.values(value).map(flattenJson).join(" ");
  return "";
}

function mapPage(page) {
  return {
    id: page.id,
    siteId: page.siteId,
    title: page.title || "",
    slug: page.slug || "",
    path: page.path || "",
    h1: page.h1 || "",
    metaDescription: page.metaDescription || "",
    status: page.status || "draft",
    content: (page.sections || []).map((section) => flattenJson(section.jsonContent)).join(" ")
  };
}

class ContentQualityRepository {
  constructor(prisma) { this.prisma = prisma; }

  async getPage(id) {
    const page = await this.prisma.agencySitePage.findUnique({
      where: { id },
      include: { sections: { orderBy: { displayOrder: "asc" } }, site: true }
    });
    return page ? { ...mapPage(page), site: page.site } : null;
  }

  async listPages({ siteId, excludeId, scope = "site" } = {}) {
    const where = {};
    if (scope !== "portfolio" && siteId) where.siteId = siteId;
    if (excludeId) where.id = { not: excludeId };
    const pages = await this.prisma.agencySitePage.findMany({
      where,
      include: { sections: { orderBy: { displayOrder: "asc" } } },
      orderBy: { updatedAt: "desc" }
    });
    return pages.map(mapPage);
  }

  async getSite(idOrSlug) {
    return this.prisma.agencySite.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] } });
  }
}

module.exports = { ContentQualityRepository, flattenJson, mapPage };
