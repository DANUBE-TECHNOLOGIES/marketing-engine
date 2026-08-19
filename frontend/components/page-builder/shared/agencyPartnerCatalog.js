"use strict";

import { FULL_PARTNERS } from "./fullPartners";
import { getPartnerProfile } from "./partnerProfile";

function text(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function canonicalPartnerMap() {
  return new Map(
    FULL_PARTNERS
      .map(getPartnerProfile)
      .filter((partner) => partner?.publishable && partner?.readyForPublication)
      .map((partner) => [partner.id, partner])
  );
}

export function resolveAgencyPartnerCandidates(items = []) {
  const canonical = canonicalPartnerMap();
  const resolved = [];

  for (const item of Array.isArray(items) ? items : []) {
    if (!item || typeof item !== "object") continue;
    const catalogPartnerId = text(item.catalogPartnerId);

    if (catalogPartnerId) {
      const partner = canonical.get(catalogPartnerId);
      if (!partner) continue;
      resolved.push({
        id: partner.id,
        catalogPartnerId: partner.id,
        name: partner.name,
        category: partner.category,
        summary: partner.summary,
        tags: Array.isArray(partner.tags) ? [...partner.tags] : [],
        logoUrl: partner.logoUrl || "",
        alt: `Logo ${partner.name}`,
        href: text(item.href),
        scope: "agency",
        source: "catalog",
      });
      continue;
    }

    resolved.push({
      ...item,
      catalogPartnerId: "",
      scope: "agency",
      source: "custom",
    });
  }

  return resolved;
}
