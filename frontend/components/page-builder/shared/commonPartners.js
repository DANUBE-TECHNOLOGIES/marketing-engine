export const COMMON_PARTNER_SPRITE = "/partners/common-partners-sprite.webp";

export const COMMON_PARTNERS = Object.freeze([
  {
    id: "fram",
    name: "FRAM",
    spriteIndex: 0,
    alt: "FRAM, partenaire voyagiste de Mondescale Voyages",
  },
  {
    id: "tui-univers",
    name: "TUI · Club Lookéa · Club Marmara · Nouvelles Frontières",
    spriteIndex: 1,
    alt: "TUI, Club Lookéa, Club Marmara et Nouvelles Frontières, partenaires de Mondescale Voyages",
  },
  {
    id: "club-med",
    name: "Club Med",
    spriteIndex: 2,
    alt: "Club Med, partenaire de Mondescale Voyages",
  },
  {
    id: "msc-croisieres",
    name: "MSC Croisières",
    spriteIndex: 3,
    alt: "MSC Croisières, partenaire de Mondescale Voyages",
  },
  {
    id: "costa-croisieres",
    name: "Costa Croisières",
    spriteIndex: 4,
    alt: "Costa Croisières, partenaire de Mondescale Voyages",
  },
  {
    id: "salaun-holidays",
    name: "Salaün Holidays",
    spriteIndex: 5,
    alt: "Salaün Holidays, partenaire de Mondescale Voyages",
  },
  {
    id: "exotismes",
    name: "Exotismes",
    spriteIndex: 6,
    alt: "Exotismes, partenaire de Mondescale Voyages",
  },
]);

export function getCommonPartners() {
  return COMMON_PARTNERS.map((partner) => ({ ...partner, sprite: COMMON_PARTNER_SPRITE }));
}
