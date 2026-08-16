"use strict";

const CRUISE_DETAILS = Object.freeze({
  "catlante-catamarans": {
    destinations: ["Corse", "Grenadines", "Seychelles", "Baléares", "Guadeloupe", "Martinique", "Antigua & Barbuda"],
    travelTypes: ["Croisière en catamaran", "Croisière à la cabine", "Privatisation", "Tout compris à bord"],
    website: "https://www.catlante-catamarans.com/fr",
  },
  croisieurope: {
    destinations: ["Rhin", "Danube", "Seine", "Loire", "Douro", "Adriatique"],
    travelTypes: ["Croisière fluviale", "Croisière côtière", "Circuit culturel"],
    website: "https://www.croisieurope.com/",
  },
  ponant: {
    destinations: ["Arctique", "Antarctique", "Groenland", "Méditerranée", "Tropiques"],
    travelTypes: ["Croisière premium", "Expédition", "Voyage polaire"],
    website: "https://www.ponant.com/",
  },
  "celestyal-cruises": {
    destinations: ["Grèce", "Îles grecques", "Turquie", "Italie", "Croatie", "Monténégro"],
    travelTypes: ["Croisière méditerranéenne", "Escales culturelles", "Itinéraire multi-pays"],
    website: "https://celestyal.com/fr/",
  },
  "explora-journeys": {
    destinations: ["Méditerranée & Europe de l’Ouest", "Caraïbes & Amérique centrale", "Alaska", "Asie", "Europe du Nord", "Amérique du Sud & Amazonie"],
    travelTypes: ["Croisière haut de gamme", "Grand voyage", "Voyage océanique", "Tour du monde"],
    website: "https://explorajourneys.com/fr/fr/",
  },
  cfc: {
    destinations: ["Méditerranée", "Adriatique", "Atlantique", "Europe du Nord", "Fjords de Norvège", "Caraïbes", "Canaries", "Islande"],
    travelTypes: ["Croisière francophone", "Départ de Marseille", "Départ de Dunkerque", "Mini-croisière", "Vol + croisière", "Transatlantique"],
    website: "https://www.cfc-croisieres.fr/",
  },
  hurtigruten: {
    destinations: ["Norvège", "Fjords", "Cap Nord", "Arctique"],
    travelTypes: ["Express côtier", "Voyage d'expédition", "Aurores boréales"],
    website: "https://www.hurtigruten.com/fr-fr/",
  },
  "msc-croisieres": {
    destinations: ["Méditerranée", "Caraïbes", "Europe du Nord", "Asie", "Amérique", "Afrique du Sud"],
    travelTypes: ["Croisière familiale", "Croisière internationale", "Tour du monde"],
    website: "https://www.msccroisieres.fr/",
  },
  "costa-croisieres": {
    destinations: ["Méditerranée", "Caraïbes & Antilles", "Europe du Nord & fjords", "Moyen-Orient", "Asie", "Canaries", "Amérique du Sud"],
    travelTypes: ["Croisière", "Mini-croisière", "Vol + croisière", "Tour du monde"],
    website: "https://www.costacroisieres.fr/",
  },
});

export function getCruisePartnerDetails(partnerId) {
  return CRUISE_DETAILS[String(partnerId || "")] || null;
}
