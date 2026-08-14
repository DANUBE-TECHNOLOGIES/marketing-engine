import { resolvedTargetCities } from "./local-area-config";
import { assessLocalContentQuality } from "./local-content-quality";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function pageKind(pageSlug, page) {
  const slug = clean(pageSlug || page?.slug).toLowerCase();
  if (!slug || ["home", "accueil", "index"].includes(slug)) return "home";
  if (["agence", "notre-agence"].includes(slug)) return "agency";
  if (["equipe", "team", "notre-equipe"].includes(slug)) return "team";
  if (slug === "services") return "services";
  if (slug === "destinations") return "destinations";
  if (["inspiration", "inspirations"].includes(slug)) return "inspirations";
  if (["offres", "offers", "promotions"].includes(slug)) return "offers";
  if (["avis", "reviews", "avis-clients"].includes(slug)) return "reviews";
  if (["contact", "nous-contacter"].includes(slug)) return "contact";
  return "generic";
}

const KIND_RECOMMENDATIONS = Object.freeze({
  home: [
    "Présenter une preuve locale forte : équipe, adresse, zone de chalandise ou expertise propre à l’agence.",
    "Mettre en avant au moins un contenu éditorial ou une destination différente des autres mini-sites du réseau.",
  ],
  agency: [
    "Raconter l’histoire réelle de l’agence, son implantation locale et ce qui distingue son équipe.",
    "Ajouter des éléments vérifiables : ancienneté, spécialités, services spécifiques ou accompagnement local.",
  ],
  team: [
    "Présenter chaque conseiller avec son prénom, son rôle, sa photo et si possible ses spécialités voyage.",
    "Éviter les biographies génériques identiques d’une agence à l’autre.",
  ],
  services: [
    "Décrire les services réellement vendus par cette agence et les situations dans lesquelles le conseil humain apporte de la valeur.",
    "Ajouter des exemples locaux ou des expertises particulières sans inventer de prestations.",
  ],
  destinations: [
    "Faire varier la sélection de destinations selon les ventes, expertises ou contenus réellement pertinents pour cette agence.",
    "Relier chaque destination à des inspirations ou conseils éditoriaux propres au mini-site.",
  ],
  inspirations: [
    "Publier régulièrement des contenus originaux attribuables à l’agence ou à son équipe.",
    "Éviter de republier le même article sur plusieurs agences avec uniquement le nom de ville remplacé.",
  ],
  offers: [
    "Utiliser des offres réellement disponibles et renouvelées, avec une date ou un contexte commercial lorsque c’est pertinent.",
    "Éviter les formulations laissant croire à un départ depuis la ville de l’agence si ce n’est pas vrai.",
  ],
  reviews: [
    "Afficher des avis propres à l’établissement et relier les témoignages à la qualité d’accompagnement locale.",
    "Maintenir la cohérence entre avis visibles, fiche Google Business Profile et identité de l’agence.",
  ],
  contact: [
    "Garantir la cohérence parfaite du nom, de l’adresse, du téléphone, des horaires et de la carte avec Google Business Profile.",
    "Ajouter un texte utile sur la prise de rendez-vous, le devis ou la préparation du premier échange.",
  ],
  generic: [
    "Donner à cette page une intention éditoriale distincte et éviter de répéter les mêmes paragraphes que les autres pages du mini-site.",
  ],
});

export function buildLocalSeoRecommendations({ site, page, pageSlug }) {
  const kind = pageKind(pageSlug, page);
  const quality = assessLocalContentQuality({ site, page });
  const agency = site?.agency || {};
  const city = clean(agency.city || site?.city);
  const nearby = resolvedTargetCities(site, { limit: 6 });
  const recommendations = [];

  if (quality.needsEditorialDepth) {
    recommendations.push({
      priority: "high",
      code: "editorial-depth",
      message: `Enrichir le contenu éditorial : la page ne contient qu’environ ${quality.words} mots exploitables.`,
    });
  }

  if (city && quality.needsLocalContext) {
    recommendations.push({
      priority: "high",
      code: "local-context",
      message: `Ajouter un contexte réellement lié à ${city} dans le contenu visible, pas uniquement dans les métadonnées.`,
    });
  }

  if (city && !nearby.length && kind === "home") {
    recommendations.push({
      priority: "medium",
      code: "service-area",
      message: "Renseigner une zone de chalandise vérifiée pour renforcer la pertinence locale au-delà de la commune principale.",
    });
  }

  for (const message of KIND_RECOMMENDATIONS[kind] || KIND_RECOMMENDATIONS.generic) {
    recommendations.push({
      priority: "medium",
      code: `differentiate-${kind}`,
      message,
    });
  }

  return {
    kind,
    city,
    nearby,
    quality,
    recommendations,
  };
}

export { KIND_RECOMMENDATIONS, pageKind };
