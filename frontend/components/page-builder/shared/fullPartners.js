"use strict";

export const PARTNER_DIRECTORY_CATEGORIES = Object.freeze([
  { id: "croisieres", label: "Croisières", eyebrow: "Croisiéristes" },
  { id: "circuits", label: "Circuits & voyages accompagnés", eyebrow: "Circuits" },
  { id: "sejours", label: "Séjours, clubs & balnéaire", eyebrow: "Séjours" },
  { id: "sur-mesure", label: "Voyages sur mesure & long-courriers", eyebrow: "Sur mesure" },
  { id: "france-europe", label: "France, Europe, résidences & bien-être", eyebrow: "France & Europe" },
]);

const P = (id, name, category, summary, tags = [], logoUrl = "") => ({ id, name, category, summary, tags, logoUrl });

export const FULL_PARTNERS = Object.freeze([
  P("catlante-catamarans", "Catlante Catamarans", "croisieres", "Croisières en catamaran et séjours nautiques, avec une approche centrée sur la mer et les mouillages.", ["catamaran", "navigation"], "/partners/catlante-catamarans.svg"),
  P("croisieurope", "CroisiEurope", "croisieres", "Croisières fluviales, maritimes et itinéraires culturels au fil des grands fleuves et régions d'Europe.", ["fluvial", "Europe"]),
  P("rivages-du-monde", "Rivages du Monde", "croisieres", "Croisières culturelles haut de gamme, fluviales, maritimes et côtières, à bord de bateaux à taille humaine avec accompagnement francophone.", ["culture", "fluvial", "haut de gamme"]),
  P("ponant", "Ponant", "croisieres", "Croisières premium et expéditions à bord de navires de petite capacité vers des itinéraires d'exception.", ["premium", "expédition"]),
  P("celestyal-cruises", "Celestyal Cruises", "croisieres", "Croisières en Méditerranée orientale, particulièrement adaptées à la découverte des îles et escales culturelles.", ["Méditerranée", "îles"]),
  P("explora-journeys", "Explora Journeys", "croisieres", "Croisières haut de gamme pensées comme des voyages océaniques, avec une forte place accordée au temps passé à destination.", ["luxe", "océan"]),
  P("cfc", "CFC - Compagnie Française de Croisières", "croisieres", "Croisières francophones au départ de ports accessibles aux voyageurs français, dans une ambiance classique et conviviale.", ["francophone", "départs France"]),
  P("hurtigruten", "Hurtigruten", "croisieres", "Voyages côtiers et expéditions dans les régions nordiques et polaires, pour les voyageurs attirés par la nature et les grands espaces.", ["Norvège", "polaire", "expédition"]),
  P("costa-croisieres", "Costa Croisières", "croisieres", "Croisières familiales et grand public en Méditerranée et vers de nombreuses destinations internationales.", ["famille", "Méditerranée"], "/partners/costa-croisieres.webp"),
  P("msc-croisieres", "MSC Croisières", "croisieres", "Croisières internationales avec une offre large de navires, d'itinéraires, de clubs enfants et de services à bord.", ["famille", "international"], "/partners/msc-croisieres.webp"),

  P("double-sens", "Double Sens", "circuits", "Voyages responsables, immersifs et itinérants privilégiant les rencontres, les expériences locales et les petits groupes.", ["responsable", "immersion"]),
  P("destination-aventure", "Destination Aventure", "circuits", "Circuits et voyages d'aventure pour découvrir une destination par ses paysages, ses activités et ses rencontres.", ["aventure", "itinérant"]),
  P("la-francaise-des-circuits", "La Française des Circuits", "circuits", "Circuits accompagnés et itinéraires organisés pour découvrir les incontournables d'une destination avec un programme structuré.", ["accompagné", "culture"]),
  P("salaun-holidays", "Salaün Holidays", "circuits", "Circuits, voyages accompagnés et itinéraires culturels en Europe et dans le monde.", ["accompagné", "autocar"]),
  P("pouchkine-tours", "Pouchkine Tours", "circuits", "Voyages et circuits culturels conçus autour de destinations à forte identité historique et patrimoniale.", ["culture", "circuit"]),
  P("nordiska", "Nordiska", "circuits", "Voyages axés sur l'Europe du Nord et les paysages nordiques, avec une approche itinérante et culturelle.", ["Europe du Nord", "circuit"]),
  P("top-of-travel", "Top of Travel", "circuits", "Séjours et circuits organisés vers des destinations européennes et méditerranéennes, avec une forte dimension de découverte.", ["Europe", "circuit"]),
  P("visit-europe", "Visit Europe", "circuits", "Circuits, escapades et séjours en Europe pour combiner patrimoine, villes et régions.", ["Europe", "culture"]),
  P("voyages-internationaux", "Voyages Internationaux", "circuits", "Circuits accompagnés et voyages organisés à travers de grandes destinations internationales.", ["monde", "accompagné"]),
  P("rev-vacances", "Rev'Vacances", "circuits", "Circuits, croisières et voyages à la carte en Europe et dans le monde, avec une forte programmation culturelle et découverte.", ["circuits", "croisières", "à la carte"]),

  P("fram", "FRAM", "sejours", "Séjours, clubs, circuits et vacances en famille dans de nombreuses destinations soleil et moyen-courrier.", ["clubs", "famille", "soleil"], "/partners/fram.webp"),
  P("tui-france", "TUI France", "sejours", "Séjours, clubs, circuits et voyages à travers les univers Club Marmara, Club Lookéa, TUI Sélection et Nouvelles Frontières.", ["clubs", "circuits", "séjours"], "/partners/tui-official.webp"),
  P("club-med", "Club Med", "sejours", "Villages de vacances tout compris en bord de mer, à la montagne et dans de nombreuses destinations internationales.", ["tout compris", "club", "famille"], "/partners/club-med-official.webp"),
  P("belambra", "Belambra Clubs", "sejours", "Clubs et résidences de vacances en France, adaptés aux familles, aux séjours balnéaires et à la montagne.", ["France", "club", "famille"]),
  P("boomerang", "Boomerang Voyages", "sejours", "Séjours balnéaires, clubs et packages vers de nombreuses destinations soleil et long-courrier.", ["soleil", "package"]),
  P("exotismes", "Exotismes", "sejours", "Séjours et voyages vers les îles et destinations tropicales, avec une forte expertise du long-courrier balnéaire.", ["îles", "tropical", "long-courrier"], "/partners/exotismes.webp"),
  P("jet-tours", "Jet tours", "sejours", "Séjours, clubs, circuits et voyages personnalisés, avec une offre allant des vacances soleil aux itinéraires long-courriers.", ["clubs", "séjours", "circuits"]),
  P("hotels-lagons", "Hôtels & Lagons", "sejours", "Séjours balnéaires et voyages dans les îles, centrés sur l'hôtellerie et les expériences au bord de l'eau.", ["îles", "hôtellerie"]),
  P("lmx-voyages", "LMX Voyages", "sejours", "Séjours packagés et vacances loisirs avec une offre large d'hôtels et de destinations accessibles.", ["séjours", "hôtels"]),
  P("mondial-tourisme", "Mondial Tourisme", "sejours", "Séjours et clubs dans les destinations soleil, particulièrement adaptés aux vacances balnéaires et familiales.", ["clubs", "soleil"]),
  P("plein-vent", "Plein Vent", "sejours", "Séjours, clubs et circuits à prix accessibles, notamment sur les destinations méditerranéennes et soleil.", ["séjours", "clubs"]),
  P("solea", "Solea", "sejours", "Séjours balnéaires et voyages soleil, avec une sélection d'hôtels dans les destinations tropicales et insulaires.", ["soleil", "îles"]),
  P("pacha-tours", "Pacha Tours", "sejours", "Séjours et circuits autour du bassin méditerranéen et de destinations culturelles ou balnéaires.", ["Méditerranée", "séjours"]),
  P("heliades", "Vacances Héliades", "sejours", "Séjours et circuits tournés vers la Méditerranée et les îles, avec une forte identité grecque et insulaire.", ["Grèce", "îles", "Méditerranée"]),
  P("voyamar", "Voyamar", "sejours", "Séjours, clubs et circuits avec une offre généraliste de destinations soleil et découvertes.", ["clubs", "circuits"]),
  P("travel-evasion", "Travel Evasion", "sejours", "Séjours, clubs francophones, circuits et croisières, avec une expertise forte de l'Égypte et du bassin méditerranéen.", ["Égypte", "séjours", "circuits"]),

  P("alma-latina", "Alma Latina", "sur-mesure", "Voyages à la carte et circuits dédiés aux cultures, paysages et grands itinéraires d'Amérique latine.", ["Amérique latine", "sur mesure"]),
  P("australie-tours", "Australie Tours", "sur-mesure", "Voyages sur mesure en Australie et dans le Pacifique, des grandes villes aux espaces naturels.", ["Australie", "Pacifique"]),
  P("amerigo", "Amerigo", "sur-mesure", "Voyages personnalisés et itinéraires long-courriers destinés aux voyageurs souhaitant construire un parcours à leur rythme.", ["sur mesure", "long-courrier"]),
  P("beachcomber-tours", "Beachcomber Tours", "sur-mesure", "Séjours haut de gamme dans l'océan Indien autour d'une sélection d'hôtels et d'expériences balnéaires.", ["océan Indien", "haut de gamme"]),
  P("climats-du-monde", "Climats du Monde", "sur-mesure", "Circuits, séjours et voyages personnalisés en Asie et vers des destinations long-courriers.", ["Asie", "long-courrier"]),
  P("asia", "Asia", "sur-mesure", "Voyages sur mesure, circuits et séjours en Asie, avec une offre allant des grands classiques aux itinéraires personnalisés.", ["Asie", "sur mesure"]),
  P("asiam", "ASIAM", "sur-mesure", "Spécialiste des voyages en Asie avec des itinéraires culturels, des circuits et des séjours personnalisables.", ["Asie", "culture"]),
  P("austral-lagons", "Austral Lagons", "sur-mesure", "Voyages dans les îles de l'océan Indien et du Pacifique, avec une forte expertise des séjours balnéaires long-courriers.", ["océan Indien", "Pacifique", "îles"]),
  P("kuoni", "KUONI", "sur-mesure", "Circuits, séjours, autotours, croisières et voyages sur mesure dans le monde, avec un positionnement haut de gamme et une forte expertise destination.", ["circuits", "sur mesure", "haut de gamme"], "/partners/kuoni-official.webp"),
  P("jetset-voyages", "JetSet Voyages", "sur-mesure", "Voyages long-courriers, combinés et séjours personnalisables dans de nombreuses destinations internationales.", ["long-courrier", "combiné"]),
  P("luxair-tours", "LuxairTours", "sur-mesure", "Séjours et packages aériens au départ du Luxembourg vers de nombreuses destinations de vacances.", ["séjours", "aérien"]),
  P("gaeland-ashling", "Gaeland Ashling", "sur-mesure", "Voyages personnalisés vers des destinations de caractère, avec une approche experte et thématique.", ["sur mesure", "expertise"]),
  P("planete-production", "Planète Production", "sur-mesure", "Voyages et programmes construits autour de destinations et expériences sélectionnées pour les agences partenaires.", ["voyage organisé", "expérience"]),

  P("campings-com", "Campings.com", "france-europe", "Séjours en camping et hébergements de plein air en France et en Europe, du mobil-home aux villages de vacances.", ["camping", "plein air"]),
  P("lagrange", "Lagrange Vacances", "france-europe", "Résidences, locations et séjours à la mer, à la montagne et à la campagne, principalement en France et en Europe.", ["résidence", "France"]),
  P("mmv", "MMV Vacances Club", "france-europe", "Clubs et résidences de vacances à la montagne, particulièrement adaptés aux séjours en famille.", ["montagne", "famille"]),
  P("pierre-vacances-center-parcs", "Pierre & Vacances / Center Parcs / maeva", "france-europe", "Résidences, villages nature, domaines de loisirs et locations de vacances en France et en Europe.", ["résidence", "famille", "France"]),
  P("ollandini", "Ollandini", "france-europe", "Spécialiste de la Corse, avec des séjours, circuits, locations et hôtels-clubs pour découvrir les différentes régions de l'île.", ["Corse", "spécialiste"]),
  P("odalys", "Odalys Voyages", "france-europe", "Résidences, locations et séjours en France et en Europe, à la mer, à la montagne et en ville.", ["résidence", "France", "Europe"]),
  P("thalasso-n1", "Thalasso N°1", "france-europe", "Séjours bien-être, thalassothérapie et escapades détente en France et à l'étranger.", ["bien-être", "thalasso"]),
  P("villages-clubs-soleil", "Villages Clubs du Soleil", "france-europe", "Villages clubs en France, à la montagne et sur le littoral, avec des formules adaptées aux familles et aux activités.", ["France", "club", "famille"]),
]);

export function getPartnerDirectoryCategories() {
  return PARTNER_DIRECTORY_CATEGORIES.map((category) => ({
    ...category,
    partners: FULL_PARTNERS.filter((partner) => partner.category === category.id),
  })).filter((category) => category.partners.length);
}
