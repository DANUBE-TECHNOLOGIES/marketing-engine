export const COMMON_PARTNERS = Object.freeze([
  {
    id: "fram",
    name: "FRAM",
    logoUrl: "/partners/fram.webp",
    alt: "FRAM, partenaire voyagiste de Mondescale Voyages",
  },
  {
    id: "tui-univers",
    name: "Univers TUI",
    alt: "TUI, Club Lookéa, Club Marmara et Nouvelles Frontières, partenaires de Mondescale Voyages",
    group: "tui",
    logoUrl: "/partners/tui-official.webp",
    children: [
      { id: "club-lookea", name: "Club Lookéa", logoUrl: "/partners/club-lookea.webp" },
      { id: "club-marmara", name: "Club Marmara", logoUrl: "/partners/club-marmara.webp" },
      { id: "nouvelles-frontieres", name: "Nouvelles Frontières", logoUrl: "/partners/nouvelles-frontieres.webp" },
    ],
  },
  {
    id: "club-med",
    name: "Club Med",
    logoUrl: "/partners/club-med-official.webp",
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
    id: "kuoni",
    name: "KUONI",
    logoUrl: "/partners/kuoni-official.webp",
    alt: "KUONI, partenaire de Mondescale Voyages",
  },
  {
    id: "exotismes",
    name: "Exotismes",
    logoUrl: "/partners/exotismes.webp",
    alt: "Exotismes, partenaire de Mondescale Voyages",
  },
]);

export function getCommonPartners() {
  return COMMON_PARTNERS.map((partner) => ({
    ...partner,
    children: partner.children?.map((child) => ({ ...child })),
    scope: "network",
  }));
}
