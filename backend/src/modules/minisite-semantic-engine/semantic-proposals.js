"use strict";

const { INTENT_BY_KEY } = require("./catalog");

function startsWithVowelSound(value = "") {
  const normalized = String(value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /^[aeiouyh]/.test(normalized);
}

function deCity(city = "") {
  const clean = String(city || "").trim();
  if (!clean) return "";
  return startsWithVowelSound(clean) ? `d’${clean}` : `de ${clean}`;
}

function aCity(city = "") {
  const clean = String(city || "").trim();
  return clean ? `à ${clean}` : "";
}

function titleFor(intentKey, city) {
  const place = aCity(city);
  const templates = {
    agency: `Agence de voyages ${place} | Mondescale`,
    services: `Services de votre agence de voyages ${place}`,
    ticketing: `Billets d’avion et vols ${place} | Mondescale`,
    cruise: `Croisières ${place} | Conseils et réservation`,
    circuit: `Circuits et voyages accompagnés ${place}`,
    "tailor-made": `Voyages sur mesure ${place} | Mondescale`,
    stay: `Séjours et vacances ${place} | Mondescale`,
    destinations: `Destinations et idées de voyage ${place}`,
    reviews: `Avis clients de notre agence ${place}`,
    team: `Votre équipe de conseillers voyages ${place}`,
    partners: `Nos partenaires voyage ${place} | Mondescale`,
    commitments: `Nos engagements pour vos voyages ${place}`,
    contact: `Contactez votre agence de voyages ${place}`,
  };
  return templates[intentKey] || `${INTENT_BY_KEY.get(intentKey)?.label || "Voyages"} ${place}`.trim();
}

function h1For(intentKey, city) {
  const place = aCity(city);
  const templates = {
    agency: `Votre agence de voyages ${place}`,
    services: `Les services de votre agence de voyages ${place}`,
    ticketing: `Billets d’avion et vols ${place}`,
    cruise: `Croisières ${place}`,
    circuit: `Circuits et voyages accompagnés ${place}`,
    "tailor-made": `Voyages sur mesure ${place}`,
    stay: `Séjours et vacances ${place}`,
    destinations: `Nos idées de destinations au départ de votre agence ${place}`,
    reviews: `Les avis de nos clients ${place}`,
    team: `Les conseillers de votre agence ${place}`,
    partners: `Les partenaires de votre agence ${place}`,
    commitments: `Nos engagements pour votre projet de voyage ${place}`,
    contact: `Contactez notre agence de voyages ${place}`,
  };
  return templates[intentKey] || `${INTENT_BY_KEY.get(intentKey)?.label || "Voyages"} ${place}`.trim();
}

function metaFor(intentKey, city) {
  const place = aCity(city);
  const templates = {
    agency: `Préparez votre voyage avec une agence locale ${place} : conseil personnalisé, billetterie, séjours, circuits, croisières et voyages sur mesure.`,
    services: `Découvrez les services de votre agence ${place} : conseil, billetterie, séjours, circuits, croisières et accompagnement avant, pendant et après le voyage.`,
    ticketing: `Besoin d’un billet d’avion ${place} ? Votre agence vous accompagne pour rechercher vos vols, comparer les solutions et organiser votre voyage.`,
    cruise: `Préparez votre croisière avec votre agence ${place} : choix de l’itinéraire et de la compagnie, conseils personnalisés et accompagnement à la réservation.`,
    circuit: `Trouvez votre circuit ou voyage accompagné avec votre agence ${place} : sélection d’itinéraires, conseils et accompagnement selon votre projet.`,
    "tailor-made": `Construisez un voyage sur mesure avec votre agence ${place} : itinéraire personnalisé, conseils de spécialistes et accompagnement adapté à votre projet.`,
    stay: `Trouvez votre prochain séjour avec votre agence ${place} : vacances, clubs et hôtels sélectionnés selon vos envies, votre budget et vos dates.`,
    destinations: `Inspirez-vous pour votre prochain voyage avec votre agence ${place} : destinations, conseils pratiques et idées adaptées à vos envies.`,
    reviews: `Consultez les avis et retours de voyageurs accompagnés par notre agence ${place} pour préparer votre projet en toute confiance.`,
    team: `Découvrez les conseillers de votre agence ${place}, leurs expertises et leur accompagnement pour construire un voyage adapté à votre projet.`,
    partners: `Découvrez les voyagistes, compagnies et partenaires sélectionnés par votre agence ${place} pour proposer des voyages adaptés à différents projets.`,
    commitments: `Conseil, disponibilité et accompagnement : découvrez les engagements de votre agence ${place} avant, pendant et après votre voyage.`,
    contact: `Contactez votre agence de voyages ${place} pour échanger avec un conseiller, demander un devis ou préparer votre prochain voyage.`,
  };
  return templates[intentKey] || `Préparez votre projet avec votre agence de voyages ${place}. Conseils personnalisés et accompagnement selon vos besoins.`;
}

function bodyBriefFor(intentKey, city) {
  const intent = INTENT_BY_KEY.get(intentKey);
  return {
    heading: `${intent?.label || "Voyage"} ${aCity(city)}`.trim(),
    targetWords: intent?.commercial ? 180 : 120,
    requiredThemes: [
      "expertise réelle de l’agence",
      "besoin ou intention du voyageur",
      `ancrage local ${deCity(city)}`.trim(),
      "accompagnement concret sans promesse non vérifiée",
    ],
    forbiddenPatterns: [
      "liste artificielle de communes voisines",
      "répétition mécanique ville + mot-clé",
      "superlatifs non vérifiables",
      "tarifs ou garanties non issus des données commerciales",
    ],
  };
}

function linksForOpportunity(opportunity = {}, graph = {}) {
  if (!opportunity.pageSlug) return [];
  return (graph.edges || [])
    .filter((edge) => edge.fromPageSlug === opportunity.pageSlug)
    .sort((a, b) => b.targetPriority - a.targetPriority || a.toPageSlug.localeCompare(b.toPageSlug, "fr"))
    .slice(0, 4)
    .map((edge) => ({
      toPageSlug: edge.toPageSlug,
      toIntent: edge.toIntent,
      anchor: INTENT_BY_KEY.get(edge.toIntent)?.label || edge.toIntent,
    }));
}

function proposalForOpportunity(opportunity = {}, { city, graph } = {}) {
  if (opportunity.type !== "strengthen-existing-page") {
    return {
      intentKey: opportunity.intentKey,
      pageSlug: null,
      type: "new-page-evidence-gate",
      readOnly: true,
      writes: false,
      requiresSearchDemandEvidence: true,
      requiresHumanReview: true,
      suggestedTitle: titleFor(opportunity.intentKey, city),
      suggestedH1: h1For(opportunity.intentKey, city),
      editorialBrief: bodyBriefFor(opportunity.intentKey, city),
    };
  }

  return {
    intentKey: opportunity.intentKey,
    pageSlug: opportunity.pageSlug,
    type: "existing-page-semantic-uplift",
    readOnly: true,
    writes: false,
    valueScore: opportunity.valueScore,
    reason: opportunity.reason,
    proposed: {
      seoTitle: titleFor(opportunity.intentKey, city),
      h1: h1For(opportunity.intentKey, city),
      metaDescription: metaFor(opportunity.intentKey, city),
      editorialBrief: bodyBriefFor(opportunity.intentKey, city),
      internalLinks: linksForOpportunity(opportunity, graph),
    },
    safeguards: {
      preserveManualBodyCopy: true,
      noAutomaticPageCreation: true,
      noAutomaticPublication: true,
      noAutomaticWrite: true,
      doorwayGuard: true,
    },
  };
}

function buildSemanticProposals(plan = {}) {
  const city = plan.site?.city || "";
  const graph = plan.topicGraph || { edges: [] };
  const proposals = (plan.opportunities || []).map((row) => proposalForOpportunity(row, { city, graph }));
  return {
    proposals,
    summary: {
      proposalCount: proposals.length,
      existingPageProposalCount: proposals.filter((row) => row.type === "existing-page-semantic-uplift").length,
      newPageEvidenceGateCount: proposals.filter((row) => row.type === "new-page-evidence-gate").length,
      automaticWriteCount: 0,
    },
  };
}

module.exports = {
  aCity,
  bodyBriefFor,
  buildSemanticProposals,
  deCity,
  h1For,
  linksForOpportunity,
  metaFor,
  proposalForOpportunity,
  titleFor,
};
