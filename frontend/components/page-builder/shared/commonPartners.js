export const COMMON_PARTNERS = Object.freeze([
  {
    id: "fram",
    name: "FRAM",
    logoUrl: "/partners/fram.webp",
    alt: "FRAM, partenaire voyagiste de Mondescale Voyages",
  },
  {
    id: "tui-univers",
    name: "TUI · Club Lookéa · Club Marmara · Nouvelles Frontières",
    logoUrl: "/partners/tui-univers.webp",
    alt: "TUI, Club Lookéa, Club Marmara et Nouvelles Frontières, partenaires de Mondescale Voyages",
  },
  {
    id: "club-med",
    name: "Club Med",
    logoUrl: "/partners/club-med.webp",
    alt: "Club Med, partenaire de Mondescale Voyages",
  },
  {
    id: "msc-croisieres",
    name: "MSC Croisières",
    logoUrl: "/partners/msc-croisieres.webp",
    alt: "MSC Croisières, partenaire de Mondescale Voyages",
  },
  {
    id: "costa-croisieres",
    name: "Costa Croisières",
    logoUrl: "/partners/costa-croisieres.webp",
    alt: "Costa Croisières, partenaire de Mondescale Voyages",
  },
  {
    id: "salaun-holidays",
    name: "Salaün Holidays",
    logoUrl: "/partners/salaun-holidays.webp",
    alt: "Salaün Holidays, partenaire de Mondescale Voyages",
  },
  {
    id: "exotismes",
    name: "Exotismes",
    logoUrl: "/partners/exotismes.webp",
    alt: "Exotismes, partenaire de Mondescale Voyages",
  },
]);

export function getCommonPartners() {
  return COMMON_PARTNERS.map((partner) => ({ ...partner, scope: "network" }));
}
