"use strict";

const {
  contentIndexesForAgency,
} = require("../ai-content/editorial-targeting");
const {
  sitePublicationError,
} = require("./errors");

async function publishedCanonicalEditorialDependencies(prisma, tenantId, agencyId) {
  const normalizedTenantId = String(tenantId || "").trim();
  const normalizedAgencyId = String(agencyId || "").trim();

  if (!normalizedTenantId || !normalizedAgencyId) return [];

  const contents = await prisma.seoContent.findMany({
    where: {
      tenantId: normalizedTenantId,
      status: "published",
      publishedAt: { not: null },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      seo: true,
      publishedAt: true,
    },
    orderBy: [
      { publishedAt: "desc" },
      { updatedAt: "desc" },
    ],
  });

  return contents
    .filter((content) => contentIndexesForAgency(content, normalizedAgencyId))
    .map((content) => ({
      id: String(content.id),
      slug: content.slug ? String(content.slug) : null,
      title: content.title ? String(content.title) : null,
      publishedAt: content.publishedAt || null,
    }));
}

async function assertSiteHasNoPublishedCanonicalEditorialDependencies(
  prisma,
  site
) {
  const dependencies = await publishedCanonicalEditorialDependencies(
    prisma,
    site?.tenantId,
    site?.agencyId
  );

  if (!dependencies.length) return;

  throw sitePublicationError(
    "SITE_CANONICAL_EDITORIAL_DEPENDENCIES",
    "Ce mini-site ne peut pas être dépublié car des inspirations publiées l’utilisent comme propriétaire canonique SEO.",
    409,
    {
      siteId: site?.id || null,
      siteSlug: site?.slug || null,
      agencyId: site?.agencyId || null,
      dependencyCount: dependencies.length,
      dependencies,
      action: "Reattribuez l’agence propriétaire SEO ou dépubliez les inspirations concernées avant de dépublier ce mini-site.",
    }
  );
}

module.exports = {
  publishedCanonicalEditorialDependencies,
  assertSiteHasNoPublishedCanonicalEditorialDependencies,
};
