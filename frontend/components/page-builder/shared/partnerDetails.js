"use strict";

const DETAILS = Object.freeze({
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
  "msc-croisieres": {
    destinations: ["Méditerranée", "Caraïbes", "Europe du Nord", "Asie", "Amérique", "Afrique du Sud"],
    travelTypes: ["Croisière familiale", "Croisière internationale", "Tour du monde"],
    website: "https://www.msccroisieres.fr/",
  },
  fram: {
    destinations: ["Méditerranée", "Canaries", "Caraïbes", "Océan Indien", "Asie", "Amériques"],
    travelTypes: ["Club Framissima", "Séjour", "Circuit", "Autotour", "City break"],
    website: "https://www.fram.fr/",
  },
  "tui-france": {
    destinations: ["Grèce", "Espagne", "Italie", "Tunisie", "Maroc", "Océan Indien", "Caraïbes"],
    travelTypes: ["Club Marmara", "Club Lookéa", "TUI Sélection", "Circuit Nouvelles Frontières"],
    website: "https://www.tui.fr/",
  },
  "club-med": {
    destinations: ["France", "Europe", "Méditerranée", "Caraïbes", "Océan Indien", "Montagne"],
    travelTypes: ["Resort tout compris", "Séjour famille", "Soleil", "Ski & montagne", "Premium"],
    website: "https://www.clubmed.fr/",
  },
  asia: {
    destinations: ["Japon", "Thaïlande", "Vietnam", "Inde", "Indonésie", "Asie du Sud-Est"],
    travelTypes: ["Voyage sur mesure", "Circuit privé", "Circuit accompagné", "Combiné"],
    website: "https://www.asia.fr/",
  },
});

export function getPartnerDetails(partnerId) {
  return DETAILS[String(partnerId || "")] || null;
}
