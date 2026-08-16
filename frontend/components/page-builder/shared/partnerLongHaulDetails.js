"use strict";

const DETAILS = Object.freeze({
  "alma-latina": {
    destinations: ["Mexique", "Costa Rica", "Colombie", "Pérou", "Argentine", "Chili", "Brésil"],
    travelTypes: ["Voyage sur mesure", "Circuit privatif", "Autotour", "Combiné"],
  },
  "australie-tours": {
    destinations: ["Australie", "Nouvelle-Zélande", "Pacifique Sud"],
    travelTypes: ["Voyage sur mesure", "Autotour", "Circuit", "Séjour"],
  },
  "beachcomber-tours": {
    destinations: ["Maurice", "Seychelles", "Maldives", "Dubaï", "Abu Dhabi", "Oman"],
    travelTypes: ["Séjour haut de gamme", "Voyage de noces", "Famille", "Golf", "Multi-centres"],
  },
  asia: {
    destinations: ["Japon", "Thaïlande", "Vietnam", "Inde", "Indonésie", "Asie du Sud-Est"],
    travelTypes: ["Voyage sur mesure", "Circuit privé", "Circuit accompagné", "Combiné"],
  },
  "austral-lagons": {
    destinations: ["Tahiti", "Seychelles", "Maurice", "Réunion", "Maldives", "Zanzibar", "Afrique australe"],
    travelTypes: ["Voyage sur mesure", "Séjour haut de gamme", "Voyage de noces", "Safari", "Combiné"],
  },
  "climats-du-monde": {
    destinations: ["Asie", "Moyen-Orient", "Afrique", "Océan Indien"],
    travelTypes: ["Circuit", "Voyage sur mesure", "Séjour", "Combiné"],
  },
  "jetset-voyages": {
    destinations: ["Amérique du Nord", "Caraïbes", "Océan Indien", "Polynésie", "Asie"],
    travelTypes: ["Séjour long-courrier", "Circuit", "Autotour", "Combiné"],
  },
  "luxair-tours": {
    destinations: ["Méditerranée", "Canaries", "Cap-Vert", "Égypte", "Destinations soleil"],
    travelTypes: ["Forfait vol + hôtel", "Séjour", "City break", "Vacances balnéaires"],
  },
  kuoni: {
    destinations: ["Europe", "Afrique", "Amériques", "Asie", "Océan Indien", "Océanie", "Grand Nord & Antarctique"],
    travelTypes: ["Circuit accompagné", "Circuit privé", "Séjour", "Autotour", "Croisière", "Voyage sur mesure"],
  },
});

export function getLongHaulPartnerDetails(partnerId) {
  return DETAILS[String(partnerId || "").trim()] || null;
}
