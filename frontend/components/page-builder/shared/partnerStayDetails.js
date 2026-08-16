"use strict";

const DETAILS = Object.freeze({
  belambra: {
    destinations: ["Alpes", "Bretagne", "Corse", "Côte d'Azur", "Occitanie", "Sud-Ouest"],
    travelTypes: ["Club vacances", "Hôtel", "Location", "Demi-pension", "Pension complète", "Séjour famille"],
    website: "https://www.belambra.fr/",
  },
  "plein-vent": {
    destinations: ["France", "Méditerranée", "Canaries", "Afrique du Nord", "Destinations soleil"],
    travelTypes: ["Club Jumbo", "Séjour", "Circuit", "Autotour", "Location", "Croisière"],
    website: "https://www.fram.fr/",
  },
  solea: {
    destinations: ["Océan Indien", "Maurice", "Seychelles", "Maldives", "Caraïbes", "Émirats", "Afrique"],
    travelTypes: ["Séjour haut de gamme", "Voyage sur mesure", "Voyage de noces", "Combiné", "Safari & plage"],
    website: "https://www.solea-voyages.fr/",
  },
  voyamar: {
    destinations: ["Tunisie", "Portugal", "Italie", "Malte", "États-Unis", "Canada", "Afrique du Sud", "Kenya", "Thaïlande", "Méditerranée"],
    travelTypes: ["Séjour", "Naya Club", "Circuit accompagné", "Autotour", "Croisière", "Circuit privatif"],
    website: "https://www.voyamar-vacances.com/",
  },
});

export function getStayPartnerDetails(partnerId) {
  return DETAILS[String(partnerId || "")] || null;
}
