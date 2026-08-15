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
  "salaun-holidays": {
    destinations: ["Europe", "Asie", "Amériques", "Afrique", "Océan Indien"],
    travelTypes: ["Circuit accompagné", "Petit groupe", "Autocar", "Séjour découverte"],
    website: "https://www.salaun-holidays.com/",
  },
  heliades: {
    destinations: ["Grèce", "Chypre", "Cap-Vert", "Portugal", "Albanie", "Caraïbes", "Amérique latine"],
    travelTypes: ["Séjour", "Club", "Circuit", "Autotour", "Périple d'île en île", "Croisière"],
    website: "https://www.heliades.fr/",
  },
  asia: {
    destinations: ["Japon", "Thaïlande", "Vietnam", "Inde", "Indonésie", "Asie du Sud-Est"],
    travelTypes: ["Voyage sur mesure", "Circuit privé", "Circuit accompagné", "Combiné"],
    website: "https://www.asia.fr/",
  },
  "austral-lagons": {
    destinations: ["Tahiti", "Seychelles", "Maurice", "Réunion", "Maldives", "Zanzibar", "Afrique australe"],
    travelTypes: ["Voyage sur mesure", "Séjour haut de gamme", "Voyage de noces", "Safari", "Combiné"],
    website: "https://australlagons.com/",
  },
  "beachcomber-tours": {
    destinations: ["Maurice", "Seychelles", "Maldives", "Dubaï", "Abu Dhabi", "Oman"],
    travelTypes: ["Séjour haut de gamme", "Voyage de noces", "Famille", "Golf", "Multi-centres"],
  },
  "thalasso-n1": {
    destinations: ["France", "Atlantique", "Bretagne", "Nouvelle-Aquitaine", "Méditerranée"],
    travelTypes: ["Thalassothérapie", "Spa", "Bien-être", "Court séjour"],
    website: "https://www.thalassonumero1.com/",
  },
});

export function getPartnerDetails(partnerId) {
  return DETAILS[String(partnerId || "")] || null;
}
