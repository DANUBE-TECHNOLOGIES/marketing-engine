"use strict";

const DETAILS = Object.freeze({
  "campings-com": {
    destinations: ["France", "Espagne", "Italie", "Croatie", "Portugal", "Europe"],
    travelTypes: ["Camping", "Mobil-home", "Village vacances", "Séjour famille"],
  },
  lagrange: {
    destinations: ["France", "Espagne", "Italie", "Suisse", "Mer", "Montagne"],
    travelTypes: ["Résidence", "Location", "Chalet", "Villa", "Séjour ski"],
  },
  mmv: {
    destinations: ["Alpes françaises", "Savoie", "Haute-Savoie", "Isère", "Hautes-Alpes"],
    travelTypes: ["Club", "Résidence Club", "Ski", "Montagne été", "Famille"],
  },
  "pierre-vacances-center-parcs": {
    destinations: ["France", "Espagne", "Pays-Bas", "Belgique", "Allemagne", "Europe"],
    travelTypes: ["Résidence", "Village nature", "Domaine de loisirs", "Location", "Séjour famille"],
    displayMode: "brand-cluster",
    brands: ["Pierre & Vacances", "Center Parcs", "maeva"],
    note: "Trois marques distinctes sont regroupées dans cette entrée pour garder une lecture simple de l'annuaire public ; chacune conserve sa propre identité de marque.",
  },
  ollandini: {
    destinations: ["Corse", "Ajaccio", "Balagne", "Golfe de Porto", "Sud Corse", "Sardaigne"],
    travelTypes: ["Séjour", "Circuit en voiture", "Circuit en autocar", "Sur mesure", "Location", "Hôtel-club"],
  },
  odalys: {
    destinations: ["France", "Espagne", "Italie", "Corse", "Mer", "Montagne"],
    travelTypes: ["Résidence", "Location", "City break", "Camping", "Séjour ski"],
  },
  "thalasso-n1": {
    destinations: ["France", "Bretagne", "Atlantique", "Méditerranée", "Europe"],
    travelTypes: ["Thalassothérapie", "Spa", "Bien-être", "Court séjour", "Cure"],
  },
  "villages-clubs-soleil": {
    destinations: ["Alpes", "Pyrénées", "Méditerranée", "Atlantique", "France"],
    travelTypes: ["Village club", "Tout compris", "Ski", "Mer", "Famille"],
  },
});

export function getFranceEuropePartnerDetails(partnerId) {
  return DETAILS[String(partnerId || "").trim()] || null;
}
