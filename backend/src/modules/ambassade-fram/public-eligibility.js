"use strict";
const PUBLISHED_STATUSES = Object.freeze(["published", "publish", "live", "online", "active"]);
function publishedSiteWhere(siteSlug, tenantSlug) {
  if (typeof siteSlug !== "string" || !/^[a-z0-9][a-z0-9-]{0,119}$/.test(siteSlug)) throw new RangeError("Invalid site slug");
  if (typeof tenantSlug !== "string" || !/^[a-z0-9][a-z0-9-]{0,119}$/.test(tenantSlug)) throw new RangeError("Invalid tenant slug");
  return {
    slug: siteSlug,
    OR: [
      { status: { in: [...PUBLISHED_STATUSES] } },
      { publishedAt: { not: null } },
    ],
    agency: { tenant: { slug: tenantSlug } },
  };
}
module.exports = { PUBLISHED_STATUSES, publishedSiteWhere };
