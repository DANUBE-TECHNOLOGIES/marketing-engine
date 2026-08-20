"use strict";

import { FULL_PARTNERS } from "./fullPartners";
import { PARTNER_LOGO_BACKLOG } from "./partnerLogoBacklog";

export const PARTNER_ASSET_COVERAGE = Object.freeze({
  expectedDirectory: "/partners",
  policy: "individual-assets-only",
  fallback: "initials",
  noSprite: true,
});

const BLOCKING_STATES = Object.freeze(new Set([
  "permission-required",
  "verification-pending",
]));

const SOURCE_READY_STATES = Object.freeze(new Set([
  "source-vetted",
  "asset-vetted",
  "active",
]));

function backlogById() {
  return new Map(PARTNER_LOGO_BACKLOG.map((item) => [item.id, item]));
}

export function getPartnerAssetCoverage() {
  const backlog = backlogById();
  const withLogo = FULL_PARTNERS.filter((partner) => Boolean(partner.logoUrl));
  const missingLogo = FULL_PARTNERS.filter((partner) => !partner.logoUrl);
  const missingByState = {};

  for (const partner of missingLogo) {
    const state = backlog.get(partner.id)?.state || "untracked";
    missingByState[state] = (missingByState[state] || 0) + 1;
  }

  const permissionBlocked = missingLogo.filter((partner) =>
    BLOCKING_STATES.has(backlog.get(partner.id)?.state)
  );
  const sourceReady = missingLogo.filter((partner) =>
    SOURCE_READY_STATES.has(backlog.get(partner.id)?.state)
  );
  const sourcePending = missingLogo.filter((partner) =>
    backlog.get(partner.id)?.state === "source-pending"
  );

  return {
    total: FULL_PARTNERS.length,
    withLogo,
    missingLogo,
    covered: withLogo.length,
    missing: missingLogo.length,
    ratio: FULL_PARTNERS.length ? withLogo.length / FULL_PARTNERS.length : 1,
    missingByState,
    permissionBlocked,
    sourceReady,
    sourcePending,
    fallbackCount: missingLogo.length,
    safeToRender: withLogo.length + missingLogo.length === FULL_PARTNERS.length,
  };
}
