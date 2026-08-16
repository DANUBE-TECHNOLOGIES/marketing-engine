"use strict";

const DETAILS = Object.freeze({
  fram: { destinations: ["Méditerranée", "Canaries", "Caraïbes", "Océan Indien", "Asie", "Amériques"], travelTypes: ["Club Framissima", "Séjour", "Circuit", "Autotour", "City break"], website: "https://www.fram.fr/" },
  "tui-france": { destinations: ["Grèce", "Espagne", "Italie", "Tunisie", "Maroc", "Océan Indien", "Caraïbes"], travelTypes: ["Club Marmara", "Club Lookéa", "TUI Sélection", "Circuit Nouvelles Frontières"], website: "https://www.tui.fr/" },
  "club-med": { destinations: ["France", "Europe", "Méditerranée", "Caraïbes", "Océan Indien", "Montagne"], travelTypes: ["Resort tout compris", "Séjour famille", "Soleil", "Ski & montagne", "Premium"], website: "https://www.clubmed.fr/" },
  belambra: { destinations: ["Alpes", "Bretagne", "Corse", "Côte d'Azur", "Occitanie", "Sud-Ouest"], travelTypes: ["Club vacances", "Hôtel", "Location", "Demi-pension", "Pension complète", "Séjour famille"], website: "https://www.belambra.fr/" },
  boomerang: { destinations: ["Caraïbes", "Océan Indien", "Afrique", "Asie", "Méditerranée", "Moyen-Orient"], travelTypes: ["Kappa Club", "Club Coralia", "Club Eldorador", "Circuit", "Autotour", "Kappa City"], website: "https://www.boomerang-voyages.com/" },
  exotismes: { destinations: ["Caraïbes", "Océan Indien", "Polynésie", "Maurice", "Seychelles", "Maldives", "Tahiti"], travelTypes: ["Séjour", "Combiné d'îles", "Circuit", "Croisière", "Voyage de noces"], website: "https://www.exotismes.fr/" },
  "jet-tours": { destinations: ["Méditerranée", "Canaries", "Caraïbes", "Océan Indien", "Afrique", "Asie", "Amériques"], travelTypes: ["Club Jet tours", "Séjour", "Circuit", "Voyage sur mesure", "Voyage de noces"], website: "https://www.jettours.com/" },
  "hotels-lagons": { destinations: ["Maurice", "Seychelles", "Maldives", "Polynésie", "Réunion", "Antilles", "Îles tropicales"], travelTypes: ["Séjour hôtelier", "Balnéaire", "Voyage de noces", "Combiné d'îles"], website: "https://www.hotels-lagons.com/" },
  "lmx-voyages": { destinations: ["Europe", "Méditerranée", "Mer Rouge", "Émirats", "Caraïbes", "Asie", "Océan Indien", "Afrique"], travelTypes: ["Package dynamique", "Séjour", "City trip", "Autotour", "Hôtel + vol"], website: "https://lmx-voyages.fr/" },
  "mondial-tourisme": { destinations: ["Tunisie", "Turquie", "Grèce", "Canaries", "Maroc", "Égypte", "République dominicaine", "Thaïlande", "Laponie"], travelTypes: ["Mondi Club", "Séjour tout inclus", "Circuit", "Croisière", "Combiné", "City break"], website: "https://www.mondialtourisme.fr/" },
  "plein-vent": { destinations: ["France", "Méditerranée", "Canaries", "Afrique du Nord", "Destinations soleil"], travelTypes: ["Club Jumbo", "Séjour", "Circuit", "Autotour", "Location", "Croisière"], website: "https://www.fram.fr/" },
  solea: { destinations: ["Océan Indien", "Maurice", "Seychelles", "Maldives", "Caraïbes", "Émirats", "Afrique"], travelTypes: ["Séjour haut de gamme", "Voyage sur mesure", "Voyage de noces", "Combiné", "Safari & plage"], website: "https://www.solea-voyages.fr/" },
  "pacha-tours": { destinations: ["Turquie", "Istanbul", "Cappadoce", "Mer Égée", "Méditerranée orientale"], travelTypes: ["Circuit", "Petit groupe", "Séjour", "Autotour", "Croisière", "Voyage à la carte"], website: "https://www.pachatours.fr/" },
  heliades: { destinations: ["Grèce", "Chypre", "Cap-Vert", "Portugal", "Albanie", "Caraïbes", "Amérique latine"], travelTypes: ["Séjour", "Club", "Circuit", "Autotour", "Périple d'île en île", "Croisière"], website: "https://www.heliades.fr/" },
  voyamar: { destinations: ["Tunisie", "Portugal", "Italie", "Malte", "États-Unis", "Canada", "Afrique du Sud", "Kenya", "Thaïlande", "Méditerranée"], travelTypes: ["Séjour", "Naya Club", "Circuit accompagné", "Autotour", "Croisière", "Circuit privatif"], website: "https://www.voyamar-vacances.com/" },
});

export function getStayPartnerDetails(partnerId) {
  return DETAILS[String(partnerId || "")] || null;
}
