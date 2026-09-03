"use strict";

const {
  targetingFromContent,
} = require("./editorial-targeting");

async function resolveEditorialCanonical(prisma, tenantId, content) {
  const targeting = targetingFromContent(content);
  if (targeting.scope !== "agencies" || !targeting.indexAgencyId) {
    return null;
  }

  const agencyId = Number(targeting.indexAgencyId);
  if (!Number.isSafeInteger(agencyId) || agencyId <= 0) return null;

  const site = await prisma.agencySite.findFirst({
    where: {
      tenantId: String(tenantId),
      agencyId,
      OR: [
        { status: "published" },
        { publishedAt: { not: null } },
      ],
    },
    select: {
      agencyId: true,
      slug: true,
      name: true,
    },
  });

  if (!site?.slug) return null;

  return {
    agencyId: String(site.agencyId),
    siteSlug: String(site.slug),
    siteName: String(site.name || "").trim() || null,
  };
}

module.exports = {
  resolveEditorialCanonical,
};
