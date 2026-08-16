"use strict";

// Transitional fallback for verified profiles that have not yet moved into a
// category-specific detail module. Specialized modules are the source of truth.
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
  "celestyal-cruises": {
    destinations: ["Grèce", "Îles grecques", "Turquie", "Italie", "Croatie", "Monténégro"],
    travelTypes: ["Croisière méditerranéenne", "Escales culturelles", "Itinéraire multi-pays"],
    website: "https://celestyal.com/fr/",
  },
  "explora-journeys": {
    destinations: ["Méditerranée & Europe de l’Ouest", "Caraïbes & Amérique centrale", "Alaska", "Asie", "Europe du Nord", "Amérique du Sud & Amazonie"],
    travelTypes: ["Croisière haut de gamme", "Grand voyage", "Voyage océanique", "Tour du monde"],
    website: "https://explorajourneys.com/fr/fr/",
  },
  hurtigruten: {
    destinations: ["Norvège", "Fjords", "Cap Nord", "Arctique"],
    travelTypes: ["Express côtier", "Voyage d'expédition", "Aurores boréales"],
    website: "https://www.hurtigruten.com/fr-fr/",
  },
  "msc-croisieres": {
    destinations: ["Méditerranée", "Caraïbes", "Europe du Nord", "Asie", "Amérique", "Afrique du Sud"],
    travelTypes: ["Croisière familiale", "Croisière internationale", "Tour du monde"],
    website: "https://www.msccroisieres.fr/",
  },
  "costa-croisieres": {
    destinations: ["Méditerranée", "Caraïbes & Antilles", "Europe du Nord & fjords", "Moyen-Orient", "Asie", "Canaries", "Amérique du Sud"],
    travelTypes: ["Croisière", "Mini-croisière", "Vol + croisière", "Tour du monde"],
    website: "https://www.costacroisieres.fr/",
  },

  "double-sens": {
    destinations: ["Europe", "Afrique", "Asie", "Amérique du Sud", "Caraïbes"],
    travelTypes: ["Voyage sur mesure", "Petit groupe", "Immersion locale", "Trek & randonnée", "Voyage solidaire"],
    website: "https://www.doublesens.fr/",
  },
  "la-francaise-des-circuits": {
    destinations: ["Europe", "Amériques", "Asie", "Afrique", "Moyen-Orient", "Océan Indien"],
    travelTypes: ["Circuit accompagné", "Autotour", "Petit groupe", "Circuit privatif", "Combiné"],
    website: "https://www.lafrancaisedescircuits.fr/",
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
  boomerang: {
    destinations: ["Caraïbes", "Océan Indien", "Afrique", "Asie", "Méditerranée", "Moyen-Orient"],
    travelTypes: ["Kappa Club", "Club Coralia", "Club Eldorador", "Circuit", "Autotour", "Kappa City"],
    website: "https://www.boomerang-voyages.com/",
  },
  "mondial-tourisme": {
    destinations: ["Tunisie", "Turquie", "Grèce", "Canaries", "Maroc", "Égypte", "République dominicaine", "Thaïlande", "Laponie"],
    travelTypes: ["Mondi Club", "Séjour tout inclus", "Circuit", "Croisière", "Combiné", "City break"],
    website: "https://www.mondialtourisme.fr/",
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
  "pacha-tours": {
    destinations: ["Turquie", "Istanbul", "Cappadoce", "Mer Égée", "Méditerranée orientale"],
    travelTypes: ["Circuit", "Petit groupe", "Séjour", "Autotour", "Croisière", "Voyage à la carte"],
    website: "https://www.pachatours.fr/",
  },
  exotismes: {
    destinations: ["Caraïbes", "Océan Indien", "Polynésie", "Maurice", "Seychelles", "Maldives", "Tahiti"],
    travelTypes: ["Séjour", "Combiné d'îles", "Circuit", "Croisière", "Voyage de noces"],
    website: "https://www.exotismes.fr/",
  },
});

export function getPartnerDetails(partnerId) {
  return DETAILS[String(partnerId || "")] || null;
}
