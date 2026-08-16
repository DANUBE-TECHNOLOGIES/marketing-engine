"use strict";

const CRUISE_DETAILS = Object.freeze({
  "catlante-catamarans": {
    destinations: ["Corse", "Grenadines", "Seychelles", "Baléares", "Guadeloupe", "Martinique", "Antigua & Barbuda"],
    travelTypes: ["Croisière en catamaran", "Croisière à la cabine", "Privatisation", "Tout compris à bord"],
    website: "https://www.catlante-catamarans.com/fr",
  },
  cfc: {
    destinations: ["Méditerranée", "Adriatique", "Atlantique", "Europe du Nord", "Fjords de Norvège", "Caraïbes", "Canaries", "Islande"],
    travelTypes: ["Croisière francophone", "Départ de Marseille", "Départ de Dunkerque", "Mini-croisière", "Vol + croisière", "Transatlantique"],
    website: "https://www.cfc-croisieres.fr/",
  },
});

export function getCruisePartnerDetails(partnerId) {
  return CRUISE_DETAILS[String(partnerId || "")] || null;
}
