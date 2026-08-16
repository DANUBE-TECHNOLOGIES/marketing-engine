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
});

export function getLongHaulPartnerDetails(partnerId) {
  return DETAILS[String(partnerId || "").trim()] || null;
}
