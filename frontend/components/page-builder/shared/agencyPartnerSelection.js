"use strict";

import { getSectionContent, getSectionType } from "../../public-site/renderers/helpers";
import { getCommonPartners } from "./commonPartners";
import { resolveAgencyPartnerCandidates } from "./agencyPartnerCatalog";
import { selectAgencyPartners } from "./partnerSelection";

const AGENCY_PARTNER_SECTION_TYPES = Object.freeze(new Set(["partner-logos", "partners", "logos"]));

export function findAgencyPartnerSelection(site) {
  const pages = Array.isArray(site?.pages) ? site.pages : [];
  for (const page of pages) {
    const sections = Array.isArray(page?.sections) && page.sections.length
      ? page.sections
      : Array.isArray(page?.blocks)
        ? page.blocks
        : [];
    for (const candidate of sections) {
      if (!AGENCY_PARTNER_SECTION_TYPES.has(getSectionType(candidate))) continue;
      const content = getSectionContent(candidate);
      if (Array.isArray(content.agencyPartners) && content.agencyPartners.length) {
        return content.agencyPartners;
      }
    }
  }
  return [];
}

export function selectedAgencyPartners(site, { max = 3 } = {}) {
  const networkItems = getCommonPartners();
  const candidates = resolveAgencyPartnerCandidates(findAgencyPartnerSelection(site));
  return selectAgencyPartners(candidates, { networkItems, max });
}

export function verifiedCatalogAgencyPartners(site, { max = 3 } = {}) {
  return selectedAgencyPartners(site, { max }).filter(
    (partner) => partner?.source === "catalog" && partner?.catalogPartnerId
  );
}

export { AGENCY_PARTNER_SECTION_TYPES };
