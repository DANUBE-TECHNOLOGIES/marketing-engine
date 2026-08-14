export const COMMON_PARTNERS = Object.freeze([
  {
    id: "fram",
    name: "FRAM",
    logo: "/partners/fram.webp",
    alt: "FRAM, partenaire voyagiste de Mondescale Voyages",
  },
  {
    id: "tui-univers",
    name: "TUI · Club Lookéa · Club Marmara · Nouvelles Frontières",
    logo: "/partners/tui-univers.webp",
    alt: "TUI, Club Lookéa, Club Marmara et Nouvelles Frontières, partenaires de Mondescale Voyages",
  },
  {
    id: "club-med",
    name: "Club Med",
    logo: "/partners/club-med.webp",
    alt: "Club Med, partenaire de Mondescale Voyages",
  },
  {
    id: "msc-croisieres",
    name: "MSC Croisières",
    logo: "/partners/msc-croisieres.webp",
    alt: "MSC Croisières, partenaire de Mondescale Voyages",
  },
  {
    id: "costa-croisieres",
    name: "Costa Croisières",
    logo: "/partners/costa-croisieres.webp",
    alt: "Costa Croisières, partenaire de Mondescale Voyages",
  },
  {
    id: "salaun-holidays",
    name: "Salaün Holidays",
    logo: "/partners/salaun-holidays.webp",
    alt: "Salaün Holidays, partenaire de Mondescale Voyages",
  },
  {
    id: "exotismes",
    name: "Exotismes",
    logo: "/partners/exotismes.webp",
    alt: "Exotismes, partenaire de Mondescale Voyages",
  },
]);

export function getCommonPartners() {
  return COMMON_PARTNERS.map((partner) => ({ ...partner }));
}
