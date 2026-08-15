"use strict";

import { FULL_PARTNERS } from "./fullPartners";

export const PARTNER_ASSET_COVERAGE = Object.freeze({
  expectedDirectory: "/partners",
  policy: "individual-assets-only",
  fallback: "initials",
  noSprite: true,
});

export function getPartnerAssetCoverage() {
  const withLogo = FULL_PARTNERS.filter((partner) => Boolean(partner.logoUrl));
  const missingLogo = FULL_PARTNERS.filter((partner) => !partner.logoUrl);

  return {
    total: FULL_PARTNERS.length,
    withLogo,
    missingLogo,
    covered: withLogo.length,
    missing: missingLogo.length,
    ratio: FULL_PARTNERS.length ? withLogo.length / FULL_PARTNERS.length : 1,
  };
}
