"use strict";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalize(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pageProfile(page = {}) {
  const source = normalize(`${page.slug || ""} ${page.title || ""}`);
  if (!source || ["home", "accueil"].includes(normalize(page.slug))) return "home";
  if (source.includes("equipe")) return "team";
  if (source.includes("partenaire")) return "partners";
  if (source.includes("avis") || source.includes("temoign")) return "reviews";
  if (source.includes("engagement")) return "commitments";
  if (source.includes("service")) return "services";
  if (source.includes("destination")) return "destinations";
  if (source.includes("agence")) return "agency";
  if (source.includes("croisi")) return "cruise";
  if (source.includes("circuit")) return "circuit";
  if (source.includes("sur-mesure") || source.includes("sur mesure")) return "custom";
  if (source.includes("sejour")) return "stay";
  if (source.includes("billet") || source.includes("vol")) return "ticketing";
  return "generic";
}

function agencyIdentity(agency = {}) {
  const city = clean(agency.city);
  const name = clean(agency.name) || (city ? `Mondescale ${city}` : "Mondescale");
  return { city, name };
}

function paragraphsForProfile(profile, { name, city, pageTitle, intentLabel } = {}) {
  const place = city ? ` à ${city}` : "";
  const agency = name || "notre agence";
  const label = clean(intentLabel);

  const profiles = {
    home: [
      `${agency}${place} vous permet de préparer votre voyage avec un interlocuteur de proximité. Cette page rassemble les principales façons de voyager et les informations utiles pour passer d’une première idée à un projet plus précis.`,
      `Selon vos dates, votre budget et le type de séjour recherché, l’échange avec l’agence permet de comparer les solutions pertinentes et de clarifier les étapes de préparation avant la réservation.`,
    ],
    agency: [
      `Cette page présente ${agency}${place} et les informations utiles pour préparer un échange avec l’agence. Elle complète les coordonnées et les éléments pratiques déjà affichés sur le mini-site.`,
      `Pour un projet de voyage, vous pouvez partir de vos dates, de votre budget et de vos priorités afin de préciser votre demande avant de comparer les solutions disponibles avec l’agence.`,
    ],
    team: [
      `Cette page est consacrée à l’équipe de ${agency}${place}. Elle vous aide à identifier l’agence qui accompagnera votre projet et à retrouver les informations utiles avant de prendre contact.`,
      `Préparer vos dates, votre budget, le nombre de voyageurs et vos principales envies permet de rendre le premier échange plus concret et de faciliter la recherche de solutions adaptées à votre demande.`,
    ],
    partners: [
      `Cette page rassemble les partenaires présentés par ${agency}${place}. Les marques et voyagistes affichés permettent de mieux comprendre l’éventail des solutions qui peuvent être étudiées selon votre projet.`,
      `Le choix d’un partenaire dépend notamment de la destination, des dates, du budget, du niveau de prestations et du type de voyage recherché. L’agence peut vous aider à comparer les options pertinentes pour votre demande.`,
    ],
    reviews: [
      `Cette page rassemble les avis associés à ${agency}${place}. Ils complètent les informations du mini-site en donnant accès aux retours publiés par les clients de l’agence.`,
      `Pour préparer votre propre projet, les avis peuvent être consultés avec les informations pratiques, les services et les pages de voyage du site avant de contacter l’agence pour une demande personnalisée.`,
    ],
    commitments: [
      `Cette page précise les engagements présentés par ${agency}${place}. Elle complète les informations pratiques du mini-site et permet de mieux comprendre le cadre d’accompagnement proposé autour d’un projet de voyage.`,
      `Un projet peut ensuite être précisé à partir de critères concrets comme les dates, le budget, le rythme souhaité et les prestations recherchées afin de faciliter la comparaison des solutions disponibles.`,
    ],
    services: [
      `Les services présentés par ${agency}${place} couvrent les différentes étapes utiles à la préparation d’un voyage. Cette page aide à identifier le type d’accompagnement à mobiliser selon votre demande.`,
      `Dates de départ, budget, transport, hébergement et rythme du séjour constituent des points de comparaison utiles avant de retenir une solution et de poursuivre la préparation avec l’agence.`,
    ],
    destinations: [
      `Les destinations présentées par ${agency}${place} servent de point de départ pour explorer différentes possibilités de voyage. Cette page permet d’orienter la recherche avant de préciser les dates et le format du séjour.`,
      `La saison, la durée disponible, le budget et les expériences recherchées peuvent ensuite être mis en perspective pour sélectionner les pistes les plus cohérentes avec votre projet.`,
    ],
    cruise: [
      `${agency}${place} peut être consultée pour préparer un projet de croisière et comparer les éléments qui structurent le voyage : itinéraire, durée, ports, dates et niveau de prestations.`,
      `Clarifier ces critères en amont facilite la comparaison des solutions et permet d’identifier les options qui correspondent le mieux au budget et au rythme de voyage recherchés.`,
    ],
    circuit: [
      `${agency}${place} peut vous aider à préparer un projet de circuit en comparant le rythme, les étapes, les transports, les hébergements et les prestations incluses dans les différentes propositions.`,
      `La durée disponible, les dates, le budget et le niveau d’accompagnement recherché permettent ensuite de mieux cibler les circuits à étudier pour votre voyage.`,
    ],
    custom: [
      `Un voyage sur mesure se construit à partir de critères concrets : dates, durée, budget, rythme et expériences recherchées. ${agency}${place} peut être consultée pour structurer ces éléments avant de comparer les solutions.`,
      `Cette préparation permet de transformer une idée générale en demande plus précise, puis d’étudier les transports, hébergements et étapes utiles à la construction du projet.`,
    ],
    stay: [
      `Pour préparer un séjour, ${agency}${place} peut être consultée afin de comparer destination, période de départ, durée, hébergement et formule selon vos priorités.`,
      `Le budget, le niveau de confort et le rythme souhaité permettent de réduire progressivement le choix et d’identifier les solutions qui méritent d’être étudiées plus en détail.`,
    ],
    ticketing: [
      `Pour un besoin de billetterie ou de vols, ${agency}${place} peut être consultée afin de comparer les itinéraires, horaires et conditions correspondant aux dates du projet.`,
      `Les correspondances, la durée du trajet et les conditions tarifaires font partie des éléments à examiner avant de retenir une solution adaptée au voyage prévu.`,
    ],
    generic: [
      `${clean(pageTitle) || "Cette page"} complète les informations proposées par ${agency}${place}. Elle permet de mieux situer ce sujet dans la préparation d’un projet de voyage avant de poursuivre vers les pages et services correspondants.`,
      `Pour avancer dans votre recherche, vos dates, votre budget et vos principales priorités constituent des repères utiles avant de comparer les solutions disponibles et de contacter l’agence si nécessaire.`,
    ],
  };

  const paragraphs = profiles[profile] || profiles.generic;
  if (label && !paragraphs.join(" ").toLowerCase().includes(label.toLowerCase())) {
    return [
      ...paragraphs,
      `La recherche peut également être précisée autour de l’intention « ${label} » lorsque celle-ci correspond à votre projet.`,
    ];
  }
  return paragraphs;
}

function selectParagraphs(paragraphs = [], missingWords = 0) {
  if (!paragraphs.length) return [];
  if (Number(missingWords || 0) <= 35) return [paragraphs[0]];
  if (Number(missingWords || 0) <= 80) return paragraphs.slice(0, 2);
  return paragraphs.slice(0, 3);
}

function buildBodyCopyPreview({ agency = {}, page = {}, action = {} } = {}) {
  if (!(action.recommendedFields || []).includes("body")) return null;

  const identity = agencyIdentity(agency);
  const profile = pageProfile(page);
  const paragraphs = paragraphsForProfile(profile, {
    ...identity,
    pageTitle: page.title,
    intentLabel: action.intentQuality?.label || null,
  });
  const selected = selectParagraphs(
    paragraphs,
    action.thinContent?.missingWords || 0
  );

  return {
    generatedBy: "mse-25.31",
    purpose: "local-seo-quality-uplift",
    profile,
    sourceFacts: {
      agencyName: identity.name,
      city: identity.city || null,
      pageSlug: page.slug || null,
      pageTitle: page.title || null,
      intent: action.intentQuality?.intent || null,
    },
    factualPolicy: "agency-and-page-context-only",
    title: identity.city
      ? `Informations utiles pour votre projet avec ${identity.name} à ${identity.city}`
      : `Informations utiles pour votre projet avec ${identity.name}`,
    html: selected.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join(""),
    paragraphCount: selected.length,
  };
}

module.exports = {
  agencyIdentity,
  buildBodyCopyPreview,
  pageProfile,
  paragraphsForProfile,
  selectParagraphs,
};
