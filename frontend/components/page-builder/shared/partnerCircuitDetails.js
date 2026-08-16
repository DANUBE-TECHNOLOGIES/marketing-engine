"use strict";

const DETAILS = Object.freeze({
  "double-sens": {
    destinations: ["Europe", "Afrique", "Asie", "Amérique du Sud", "Caraïbes"],
    travelTypes: ["Voyage sur mesure", "Petit groupe", "Immersion locale", "Trek & randonnée", "Voyage solidaire"],
    website: "https://www.doublesens.fr/",
  },
  "destination-aventure": {
    destinations: ["Islande", "Europe", "Afrique", "Asie", "Amériques", "Océanie"],
    travelTypes: ["Voyage d'aventure", "Trek & randonnée", "Multi-sports", "Voyage famille", "Voyage sur mesure", "Voyage Signature"],
    website: "https://destinationaventure.fr/",
  },
  "la-francaise-des-circuits": {
    destinations: ["Europe", "Amériques", "Asie", "Afrique", "Moyen-Orient", "Océan Indien"],
    travelTypes: ["Circuit accompagné", "Autotour", "Petit groupe", "Circuit privatif", "Combiné"],
    website: "https://www.lafrancaisedescircuits.fr/",
  },
  "salaun-holidays": {
    destinations: ["Europe", "Asie", "Amériques", "Afrique", "Océan Indien"],
    travelTypes: ["Circuit accompagné", "Petit groupe", "Autocar", "Séjour découverte"],
    website: "https://www.salaun-holidays.com/",
  },
  "pouchkine-tours": {
    destinations: ["Europe de l'Est", "Europe centrale", "Balkans", "Caucase", "Asie centrale"],
    travelTypes: ["Circuit culturel", "Circuit accompagné", "Voyage découverte", "Itinéraire patrimonial"],
    website: "https://www.salaun-holidays.com/informations/brochures-salaun-holidays",
  },
  nordiska: {
    destinations: ["Norvège", "Finlande", "Suède", "Danemark", "Islande", "Laponie"],
    travelTypes: ["Circuit accompagné", "Croisière", "Autotour", "Séjour découverte", "Circuit privatif", "Voyage à la carte"],
    website: "https://www.salaun-holidays.com/nordiska",
  },
  "top-of-travel": {
    destinations: ["Albanie", "Croatie", "Italie", "Portugal", "Madère", "Malte", "Monténégro", "Jordanie", "Cap-Vert"],
    travelTypes: ["Circuit accompagné", "Autotour", "Séjour", "Top Clubs", "Voyage à la carte"],
    website: "https://www.topoftravel.fr/",
  },
  "visit-europe": {
    destinations: ["Italie", "Portugal", "Espagne", "Norvège", "Écosse", "Autriche", "Oman", "Géorgie", "Europe & Orient"],
    travelTypes: ["Circuit", "Autotour", "Croisière", "Week-end", "Voyage en train", "Slow tourisme"],
    website: "https://www.visiteurope.fr/",
  },
  "voyages-internationaux": {
    destinations: ["Europe", "Amériques", "Afrique", "Asie", "Océanie"],
    travelTypes: ["Circuit accompagné", "Voyage en autocar", "Voyage en avion", "Découverte culturelle"],
    website: "https://www.voyages-internationaux.fr/",
  },
  worldia: {
    destinations: ["Europe", "Asie", "Amérique du Nord", "Amérique du Sud", "Moyen-Orient", "Afrique", "Îles"],
    travelTypes: ["Voyage sur mesure", "Road trip", "City break", "Expédition", "Itinéraire multi-destinations"],
  },
});

export function getCircuitPartnerDetails(partnerId) {
  return DETAILS[String(partnerId || "")] || null;
}
