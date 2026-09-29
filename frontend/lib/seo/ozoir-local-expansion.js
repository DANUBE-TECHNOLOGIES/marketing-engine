const OZOIR_SITE =
  "ambassade-fram-mondescale-ozoir-la-ferriere";

export const OZOIR_LOCAL_EXPANSION = Object.freeze({
  siteSlug: OZOIR_SITE,

  primaryCity: "Ozoir-la-Ferrière",

  coreCities: Object.freeze([
    "Pontault-Combault",
    "Roissy-en-Brie",
    "Gretz-Armainvilliers",
    "Tournan-en-Brie",
    "Lésigny",
  ]),

  extendedCities: Object.freeze([
    "Férolles-Attilly",
    "Servon",
    "Chevry-Cossigny",
  ]),

  commercialIntents: Object.freeze([
    "séjours",
    "circuits",
    "croisières",
    "voyages sur mesure",
    "billetterie",
    "clubs FRAM et Framissima",
    "voyages de noces",
    "voyages en famille",
  ]),

  heading:
    "Votre agence de voyages à Ozoir-la-Ferrière, proche de Pontault-Combault, Roissy-en-Brie et des communes voisines",

  introduction:
    "Installée à Ozoir-la-Ferrière, l’équipe Mondescale accompagne également les voyageurs de Pontault-Combault, Roissy-en-Brie, Gretz-Armainvilliers, Tournan-en-Brie et Lésigny. Vous pouvez préparer votre projet en agence, par téléphone ou à distance, avec le même conseiller tout au long de votre dossier.",

  services:
    "Séjours, circuits, croisières, voyages sur mesure, billetterie, clubs FRAM et Framissima, voyages de noces ou vacances en famille : l’agence étudie votre projet, compare les solutions adaptées et assure le suivi avant, pendant et après votre réservation.",

  fram:
    "En tant qu’Ambassade FRAM, l’agence Mondescale d’Ozoir-la-Ferrière accompagne les voyageurs souhaitant découvrir les offres FRAM et Framissima tout en bénéficiant du conseil et du suivi d’une agence physique de proximité.",

  remote:
    "Vous n’avez pas besoin d’habiter Ozoir-la-Ferrière pour nous confier votre voyage. Les échanges peuvent commencer par téléphone ou à distance puis se poursuivre en agence lorsque vous le souhaitez.",

  cta:
    "Parlez-nous de votre prochain voyage : contactez l’agence Mondescale d’Ozoir-la-Ferrière, demandez un devis ou préparez votre venue en agence.",

  cityCopy: Object.freeze({
    "Pontault-Combault":
      "Vous habitez Pontault-Combault ? L’agence Mondescale d’Ozoir-la-Ferrière accueille les voyageurs de Pontault-Combault qui recherchent un interlocuteur de proximité pour leurs séjours, circuits, croisières, voyages sur mesure, billetterie ou vacances FRAM.",

    "Roissy-en-Brie":
      "Depuis Roissy-en-Brie, vous pouvez confier votre projet à l’équipe Mondescale d’Ozoir-la-Ferrière et bénéficier d’un accompagnement personnalisé en agence, par téléphone ou à distance.",

    "Gretz-Armainvilliers":
      "Les voyageurs de Gretz-Armainvilliers peuvent préparer avec l’agence d’Ozoir-la-Ferrière leurs vacances, circuits, croisières et voyages sur mesure avec un suivi personnalisé du projet.",

    "Tournan-en-Brie":
      "Pour les voyageurs de Tournan-en-Brie, Mondescale Ozoir-la-Ferrière constitue un point de conseil de proximité pour comparer et organiser séjours, circuits, croisières et voyages personnalisés.",

    "Lésigny":
      "Les habitants de Lésigny peuvent également faire appel à l’agence Mondescale d’Ozoir-la-Ferrière pour construire leur prochain voyage et choisir entre rendez-vous en agence, téléphone et accompagnement à distance.",
  }),

  faq: Object.freeze([
    {
      question:
        "Quelle agence de voyages choisir près de Pontault-Combault ?",
      answer:
        "Mondescale dispose d’une agence physique à Ozoir-la-Ferrière. Elle accueille notamment les voyageurs de Pontault-Combault pour les séjours, circuits, croisières, voyages sur mesure, billetterie et produits FRAM.",
    },
    {
      question:
        "Puis-je préparer mon voyage à distance avec l’agence d’Ozoir-la-Ferrière ?",
      answer:
        "Oui. Un projet peut être préparé par téléphone et à distance, avec la possibilité de poursuivre ensuite les échanges directement à l’agence d’Ozoir-la-Ferrière.",
    },
    {
      question:
        "L’agence d’Ozoir-la-Ferrière propose-t-elle les voyages FRAM et Framissima ?",
      answer:
        "Oui. Mondescale Ozoir-la-Ferrière est Ambassade FRAM et accompagne ses clients dans le choix et la réservation des offres FRAM et Framissima.",
    },
    {
      question:
        "L’agence organise-t-elle des voyages sur mesure et des croisières ?",
      answer:
        "Oui. L’équipe accompagne les projets de voyages sur mesure, croisières, circuits, séjours et autres prestations proposées par ses partenaires.",
    },
  ]),
});

export function isOzoirExpansionSite(site) {
  return String(site?.slug || "").trim().toLowerCase() === OZOIR_SITE;
}

export function ozoirLocalExpansion(site) {
  return isOzoirExpansionSite(site) ? OZOIR_LOCAL_EXPANSION : null;
}
