"use strict";

const INTENT_CATALOG = Object.freeze([
  { key: "agency", label: "agence de voyages", priority: 100, commercial: true, pageHints: ["home", "accueil", "agence"], terms: ["agence de voyages", "conseil voyage", "agence locale"] },
  { key: "services", label: "services de l’agence", priority: 92, commercial: true, pageHints: ["services"], terms: ["services", "accompagnement", "conseil personnalisé"] },
  { key: "ticketing", label: "billetterie et vols", priority: 90, commercial: true, pageHints: ["billetterie", "vol", "vols"], terms: ["billet d’avion", "billet avion", "billetterie", "vol", "vols", "aérien"] },
  { key: "cruise", label: "croisières", priority: 88, commercial: true, pageHints: ["croisiere", "croisieres"], terms: ["croisière", "croisières", "compagnie de croisière"] },
  { key: "circuit", label: "circuits", priority: 86, commercial: true, pageHints: ["circuit", "circuits"], terms: ["circuit", "circuits", "voyage accompagné"] },
  { key: "tailor-made", label: "voyages sur mesure", priority: 86, commercial: true, pageHints: ["sur-mesure", "sur_mesure", "surmesure"], terms: ["sur mesure", "voyage personnalisé", "voyage à la carte"] },
  { key: "stay", label: "séjours", priority: 84, commercial: true, pageHints: ["sejour", "sejours", "club", "clubs"], terms: ["séjour", "séjours", "club", "vacances"] },
  { key: "destinations", label: "destinations", priority: 80, commercial: true, pageHints: ["destination", "destinations"], terms: ["destination", "destinations", "inspiration voyage"] },
  { key: "reviews", label: "avis clients", priority: 70, commercial: false, pageHints: ["avis"], terms: ["avis clients", "témoignages", "retours voyageurs"] },
  { key: "team", label: "équipe", priority: 68, commercial: false, pageHints: ["equipe", "équipe"], terms: ["équipe", "conseillers", "conseillères", "experts voyage"] },
  { key: "partners", label: "partenaires", priority: 62, commercial: false, pageHints: ["partenaire", "partenaires"], terms: ["partenaires", "voyagistes", "tour opérateurs", "tour-opérateurs"] },
  { key: "commitments", label: "engagements", priority: 60, commercial: false, pageHints: ["engagement", "engagements"], terms: ["engagements", "accompagnement", "service client"] },
  { key: "contact", label: "contact", priority: 58, commercial: false, pageHints: ["contact"], terms: ["contact", "rendez-vous", "nous contacter"] },
]);

const INTENT_BY_KEY = new Map(INTENT_CATALOG.map((intent) => [intent.key, intent]));
const DEFAULT_COVERAGE_THRESHOLD = 45;
const STRONG_COVERAGE_THRESHOLD = 70;
const CANNIBALIZATION_THRESHOLD = 62;

module.exports = {
  CANNIBALIZATION_THRESHOLD,
  DEFAULT_COVERAGE_THRESHOLD,
  INTENT_BY_KEY,
  INTENT_CATALOG,
  STRONG_COVERAGE_THRESHOLD,
};
