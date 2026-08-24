const definitions = require("../templates/section-definitions");

function clean(value, fallback = "") { return value === null || value === undefined || value === "" ? fallback : String(value); }
function contact(agency) {
  return {
    address: clean(agency.address), postalCode: clean(agency.postalCode), city: clean(agency.city),
    phone: clean(agency.phone), email: clean(agency.email), website: clean(agency.website),
    googleReviewUrl: clean(agency.googleReviewUrl)
  };
}
class ContentBuilder {
  build(page, agency, site) {
    const name = clean(agency.name, `Agence Mondescale ${clean(agency.city, "Voyages")}`);
    const city = clean(agency.city, "votre ville");
    const shared = { agencyId: agency.id, agencyName: name, city, contact: contact(agency), sitePath: site.basePath };
    const factories = {
      "hero": () => ({ eyebrow: `Agence de voyages à ${city}`, title: name, text: `Construisons ensemble un voyage adapté à vos envies, à votre budget et à votre façon de voyager.`, primaryCta: { label: "Demander un devis", href: `${site.basePath}/contact` }, secondaryCta: { label: "Découvrir l’agence", href: `${site.basePath}/agence` } }),
      "page-header": () => page.pageType === "PARTNERS"
        ? ({ eyebrow: `Partenaires voyage · ${city}`, title: page.h1, introduction: `Découvrez les tour-opérateurs, croisiéristes et spécialistes avec lesquels ${name}, votre agence de voyages à ${city}, peut construire et comparer les solutions de votre prochain voyage.` })
        : page.pageType === "TEAM"
          ? ({ eyebrow: `Votre équipe · ${city}`, title: page.h1, introduction: `Rencontrez les conseillers de ${name} : une équipe de proximité pour écouter votre projet, comparer les solutions et vous accompagner jusqu’au retour.` })
          : ({ title: page.h1, introduction: `${page.title} avec ${name}, votre agence de voyages à ${city}.` }),
      "agency-introduction": () => ({ title: `Votre projet voyage commence à ${city}`, paragraphs: [`L’équipe de ${name} vous accompagne avant, pendant et après votre voyage.`, `Nous comparons les solutions adaptées à votre projet et restons votre interlocuteur de proximité.`], link: { label: "En savoir plus sur l’agence", href: `${site.basePath}/agence` } }),
      "agency-story": () => ({ title: `Une agence proche de ses voyageurs`, paragraphs: [`${name} accompagne les voyageurs de ${city} et des environs dans leurs projets de vacances, circuits, croisières et voyages sur mesure.`, `Notre rôle est de vous faire gagner du temps, de sécuriser vos choix et de construire un séjour cohérent.`] }),
      "agency-details": () => ({ title: "Informations pratiques", ...contact(agency) }),
      "services-highlight": () => ({ title: "Nos services", items: [{ title: "Séjours", text: "Des séjours sélectionnés selon vos attentes." }, { title: "Circuits", text: "Des itinéraires accompagnés ou privatifs." }, { title: "Croisières", text: "Compagnies, itinéraires et cabines comparés." }, { title: "Sur mesure", text: "Un voyage construit avec votre conseiller." }], link: { label: "Voir tous nos services", href: `${site.basePath}/services` } }),
      "services-grid": () => ({ title: "Une réponse pour chaque projet", items: [{ title: "Séjours et clubs", text: "Pour partir sereinement avec une formule adaptée." }, { title: "Circuits accompagnés", text: "Pour découvrir une destination avec un itinéraire structuré." }, { title: "Croisières", text: "Maritimes ou fluviales, selon vos envies." }, { title: "Voyages de noces", text: "Une expérience pensée pour votre couple." }, { title: "Voyages en famille", text: "Rythme, hébergement et activités adaptés." }, { title: "Billetterie et prestations", text: "Transport, assurance et services complémentaires." }] }),
      "custom-travel": () => ({ title: "Votre voyage sur mesure", text: "Nous partons de vos priorités pour construire un voyage réaliste, équilibré et personnalisé." }),
      "booking-support": () => ({ title: "Un suivi jusqu’au retour", items: ["Conseil et comparaison", "Formalités et assurances", "Suivi du dossier", "Assistance avant le départ"] }),
      "destinations-highlight": () => ({ title: "Des destinations pour toutes les envies", text: "Soleil, culture, grands espaces ou escapade : échangez avec notre équipe pour identifier la destination qui vous correspond.", link: { label: "Explorer nos destinations", href: `${site.basePath}/destinations` } }),
      "destinations-introduction": () => ({ title: "Où souhaitez-vous partir ?", text: "Notre agence vous aide à choisir la bonne destination selon la saison, la durée, le budget et les voyageurs." }),
      "destination-families": () => ({ title: "Explorez le monde", items: ["Europe", "Afrique et océan Indien", "Asie", "Amériques", "Moyen-Orient", "Océanie"] }),
      "trust": () => ({ title: "Pourquoi nous confier votre voyage ?", items: ["Un interlocuteur identifié", "Des conseils personnalisés", "Des partenaires sélectionnés", "Un suivi humain du dossier"] }),
      "team-introduction": () => ({ title: `Des conseillers voyage à ${city}, à votre écoute`, text: `L’équipe de ${name} partage son expérience et ses conseils pour construire un voyage cohérent avec votre projet.` }),
      "team": () => ({ title: `L’équipe de votre agence de voyages à ${city}`, text: `Découvrez les conseillers qui vous accompagnent à ${city}, de la première idée jusqu’à votre retour de voyage.`, members: Array.isArray(agency.team) ? agency.team : Array.isArray(agency.members) ? agency.members : [] }),
      "expertise": () => ({ title: "Notre expertise", items: ["Écoute du besoin", "Sélection des partenaires", "Construction du voyage", "Suivi et accompagnement"] }),
      "commitments": () => ({ title: "Nos engagements", items: [{ title: "Écoute", text: "Comprendre vos priorités avant de proposer." }, { title: "Clarté", text: "Expliquer les prestations et conditions du voyage." }, { title: "Disponibilité", text: "Vous accompagner aux étapes importantes." }, { title: "Responsabilité", text: "Sélectionner des solutions adaptées et réalistes." }] }),
      "partners-introduction": () => ({ title: `Des partenaires sélectionnés par votre agence à ${city}`, text: `${name} s’appuie sur un réseau de tour-opérateurs, croisiéristes et spécialistes pour comparer des solutions adaptées à votre projet. Votre conseiller reste votre interlocuteur pour vérifier les disponibilités, les conditions et la solution réellement pertinente pour votre voyage. La présence d’une marque dans cet annuaire présente notre univers de partenaires et ne constitue ni une garantie de disponibilité ni une recommandation automatique pour chaque dossier.` }),
      "partner-directory": () => ({ title: "Tous nos partenaires voyage", text: `Parcourez les partenaires mobilisables par ${name}. Les marques sont présentées par univers pour faciliter l’exploration ; votre conseiller à ${city} reste disponible pour comparer les offres et construire votre voyage.` }),
      "partner-categories": () => ({ title: "Tous nos partenaires voyage", text: `Parcourez les partenaires mobilisables par ${name}.`, items: ["Tour-opérateurs généralistes", "Spécialistes destinations", "Compagnies de croisière", "Compagnies aériennes", "Assureurs voyage", "Réceptifs locaux"] }),
      "inspiration-introduction": () => ({ title: "Trouvez l’idée qui vous ressemble", text: "Partez d’une envie, d’une saison ou d’une occasion : notre équipe transforme l’inspiration en projet concret." }),
      "travel-themes": () => ({ title: "Inspirations", items: ["Voyage en famille", "Escapade en couple", "Voyage de noces", "Circuit culturel", "Croisière", "Grands espaces", "Soleil en hiver", "Week-end en Europe"] }),
      "advisor-help": () => ({ title: "Besoin d’aide pour choisir ?", text: `Échangez avec un conseiller de ${name} pour confronter vos envies aux réalités de la destination.` }),
      "reviews-introduction": () => ({ title: "L’expérience de nos voyageurs", text: "Les retours de nos clients nous aident à améliorer notre accompagnement et à partager des expériences utiles." }),
      "review-proof": () => ({ title: "Des avis vérifiables", text: agency.googleReviewUrl ? "Consultez les avis publiés sur la fiche Google de l’agence." : "Les avis Google de l’agence seront affichés ici dès que la liaison sera active.", url: clean(agency.googleReviewUrl) }),
      "review-cta": () => ({ title: "Vous avez voyagé avec nous ?", text: "Votre retour aide les futurs voyageurs à choisir leur agence." }),
      "contact-details": () => ({ title: `Contactez ${name}`, ...contact(agency) }),
      "opening-contact": () => ({ title: "Préparer votre rendez-vous", text: "Indiquez la destination envisagée, les dates, le nombre de voyageurs et votre budget afin de faciliter le premier échange." }),
      "map-placeholder": () => ({ title: "Venir à l’agence", address: [clean(agency.address), `${clean(agency.postalCode)} ${city}`].filter(Boolean).join(", "), status: "awaiting-map-provider" }),
      "contact-cta": () => ({ title: "Parlons de votre prochain voyage", text: `Contactez ${name} pour obtenir un conseil personnalisé.`, actions: [{ label: "Nous contacter", href: `${site.basePath}/contact` }, ...(agency.phone ? [{ label: clean(agency.phone), href: `tel:${clean(agency.phone).replace(/\s+/g, "")}` }] : [])] }),
      "legal-notice": () => ({ title: "Mentions légales", status: "requires-company-legal-profile", text: "Les informations juridiques de l’éditeur, de l’hébergeur et du responsable de publication doivent être renseignées avant publication." }),
      "privacy-notice": () => ({ title: "Protection des données personnelles", status: "requires-privacy-profile", text: "La politique complète de confidentialité et de gestion des cookies doit être validée avant publication." })
    };
    const types = definitions[page.pageType] || ["page-header", "contact-cta"];
    return types.map((type, index) => ({ sectionType: type, displayOrder: (index + 1) * 10, content: { ...shared, ...(factories[type] ? factories[type]() : {}) } }));
  }
}
module.exports = ContentBuilder;