"use strict";

const {
  DEFAULT_SERVICES,
  DEFAULT_TRUST_ITEMS,
} =
  require(
    "../constants"
  );

const {
  renderContentObject,
} =
  require(
    "../template-renderer"
  );

const COMMON_HOME_PARTNERS = Object.freeze([
  { id: "fram", name: "FRAM", logoUrl: "/partners/fram.webp", scope: "network" },
  { id: "tui-univers", name: "TUI · Club Lookéa · Club Marmara · Nouvelles Frontières", logoUrl: "/partners/tui-univers.webp", scope: "network" },
  { id: "club-med", name: "Club Med", logoUrl: "/partners/club-med.webp", scope: "network" },
  { id: "msc-croisieres", name: "MSC Croisières", logoUrl: "/partners/msc-croisieres.webp", scope: "network" },
  { id: "costa-croisieres", name: "Costa Croisières", logoUrl: "/partners/costa-croisieres.webp", scope: "network" },
  { id: "salaun-holidays", name: "Salaün Holidays", logoUrl: "/partners/salaun-holidays.webp", scope: "network" },
  { id: "exotismes", name: "Exotismes", logoUrl: "/partners/exotismes.webp", scope: "network" },
]);

const HOME_TEMPLATE = {
  hero: {
    eyebrow: "Agence de voyages à {{agency.city}}",
    title: "Votre agence de voyages à {{agency.city}}",
    subtitle: "{{agency.name}} vous accompagne pour imaginer, organiser et réserver un voyage adapté à vos envies.",
    primaryCta: { label: "Préparer mon voyage", href: "{{computed.contactPath}}", kind: "primary" },
    secondaryCta: { label: "Découvrir l'agence", href: "{{computed.agencyPath}}", kind: "secondary" },
  },
  introduction: {
    title: "Une agence proche de vous à {{agency.city}}",
    body: "Notre équipe vous accompagne dans la préparation de vos vacances, séjours, circuits, croisières et voyages sur mesure. Échangez avec un conseiller pour construire un projet adapté à vos attentes et à votre budget.",
    link: { label: "Découvrir notre agence", href: "{{computed.agencyPath}}" },
  },
  services: {
    title: "Tous vos projets de voyage",
    introduction: "De l'idée de départ jusqu'à votre retour, {{agency.name}} vous accompagne dans chaque étape de votre voyage.",
    link: { label: "Voir tous nos services", href: "{{computed.servicesPath}}" },
  },
  destinations: {
    title: "Où souhaitez-vous partir ?",
    introduction: "Plage, circuit, grand voyage, escapade ou destination lointaine : partagez-nous vos envies et construisons votre prochain départ.",
    cta: { label: "Demander un devis", href: "{{computed.contactPath}}", kind: "primary" },
  },
  partners: {
    title: "Les plus grands voyagistes, un seul conseiller",
    text: "Nous sélectionnons parmi des partenaires reconnus les vacances qui correspondent vraiment à vos envies.",
  },
  contact: {
    title: "Un projet de voyage ?",
    body: "Parlez-en avec l'équipe de {{agency.name}}. Nous étudions votre projet et recherchons les solutions adaptées à vos envies.",
    primaryCta: { label: "Demander un devis", href: "{{computed.contactPath}}", kind: "primary" },
    phone: "{{agency.phone}}",
    email: "{{agency.email}}",
  },
};

function homeSections(context) {
  const rendered = renderContentObject(HOME_TEMPLATE, context);

  return [
    { sectionType: "hero", displayOrder: 10, content: rendered.value.hero },
    { sectionType: "agency-introduction", displayOrder: 20, content: rendered.value.introduction },
    {
      sectionType: "services-highlight",
      displayOrder: 30,
      content: { ...rendered.value.services, items: DEFAULT_SERVICES.slice(0, 4) },
    },
    { sectionType: "destinations-highlight", displayOrder: 40, content: rendered.value.destinations },
    {
      sectionType: "trust",
      displayOrder: 50,
      content: { title: "Pourquoi préparer votre voyage avec nous ?", items: DEFAULT_TRUST_ITEMS },
    },
    {
      sectionType: "partner-logos",
      displayOrder: 60,
      content: {
        ...rendered.value.partners,
        items: COMMON_HOME_PARTNERS.map(partner => ({ ...partner })),
        agencyPartners: [],
        maxAgencyPartners: 3,
      },
    },
    { sectionType: "contact-cta", displayOrder: 70, content: rendered.value.contact },
  ];
}

module.exports = {
  COMMON_HOME_PARTNERS,
  HOME_TEMPLATE,
  homeSections,
};
