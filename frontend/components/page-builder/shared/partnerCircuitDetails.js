"use strict";

const DETAILS = Object.freeze({
  "destination-aventure": {
    destinations: ["Islande", "Europe", "Afrique", "Asie", "Amériques", "Océanie"],
    travelTypes: ["Voyage d'aventure", "Trek & randonnée", "Multi-sports", "Voyage famille", "Voyage sur mesure", "Voyage Signature"],
    website: "https://destinationaventure.fr/",
  },
  nordiska: {
    destinations: ["Norvège", "Finlande", "Suède", "Danemark", "Islande", "Laponie"],
    travelTypes: ["Circuit accompagné", "Croisière", "Autotour", "Séjour découverte", "Circuit privatif", "Voyage à la carte"],
    website: "https://www.salaun-holidays.com/circuits/nordiska",
  },
});

export function getCircuitPartnerDetails(partnerId) {
  return DETAILS[String(partnerId || "")] || null;
}
