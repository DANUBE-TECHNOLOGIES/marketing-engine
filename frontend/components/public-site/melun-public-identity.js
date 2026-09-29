export const MELUN_CANONICAL_SLUG =
  "ambassade-fram-mondescale-melun";

export const MELUN_POST_TUI_NAME =
  "Mondescale Voyages – Melun";

export function resolvePublicAgencyName(site) {
  if (site?.slug === MELUN_CANONICAL_SLUG) {
    return MELUN_POST_TUI_NAME;
  }

  return site?.name || "";
}

export function isPostTuiMelun(site) {
  return site?.slug === MELUN_CANONICAL_SLUG;
}
