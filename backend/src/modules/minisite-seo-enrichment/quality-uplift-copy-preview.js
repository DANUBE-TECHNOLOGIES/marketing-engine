"use strict";

const crypto = require("node:crypto");

function clean(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function normalize(value) { return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function escapeHtml(value) { return clean(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;"); }
function stableIndex(seed, length) { if (!length) return 0; const hex = crypto.createHash("sha256").update(String(seed || "mse-25.31")).digest("hex").slice(0, 8); return parseInt(hex, 16) % length; }
function rotate(values, seed) { if (!values.length) return []; const offset = stableIndex(seed, values.length); return values.slice(offset).concat(values.slice(0, offset)); }
function deCity(city) {
  const value = clean(city);
  if (!value) return "";
  return /^[aeiouyàâäéèêëîïôöùûüÿh]/i.test(value) ? `d’${value}` : `de ${value}`;
}
function pageProfile(page = {}) {
  const source = normalize(`${page.slug || ""} ${page.title || ""}`);
  if (!source || ["home", "accueil"].includes(normalize(page.slug))) return "home";
  if (source.includes("equipe")) return "team";
  if (source.includes("partenaire")) return "partners";
  if (source.includes("avis") || source.includes("temoign")) return "reviews";
  if (source.includes("engagement")) return "commitments";
  if (source.includes("service")) return "services";
  if (source.includes("destination")) return "destinations";
  if (source.includes("agence")) return "agency";
  if (source.includes("croisi")) return "cruise";
  if (source.includes("circuit")) return "circuit";
  if (source.includes("sur-mesure") || source.includes("sur mesure")) return "custom";
  if (source.includes("sejour")) return "stay";
  if (source.includes("billet") || source.includes("vol")) return "ticketing";
  return "generic";
}
function agencyIdentity(agency = {}) {
  const city = clean(agency.city);
  const name = clean(agency.name) || (city ? `Mondescale ${city}` : "Mondescale");
  const shortName = city && normalize(name).endsWith(normalize(city)) ? name.slice(0, Math.max(0, name.length - city.length)).replace(/[\s-]+$/, "") : name;
  return { city, name, shortName: clean(shortName) || name };
}
function variantsForProfile(profile, { name, city, pageTitle } = {}) {
  const agencyAtCity = city ? `l’agence ${deCity(city)}` : "l’agence";
  const profiles = {
    team: [
      [`Derrière chaque projet confié à ${name}, l’échange avec l’équipe permet de préciser les attentes avant d’étudier les solutions de voyage. Cette page vous présente les conseillers qui accompagnent les demandes de ${agencyAtCity}.`, `Dates possibles, budget, composition des voyageurs et envies de séjour constituent une bonne base pour préparer le rendez-vous. Ces repères permettent à l’équipe de mieux cibler les recherches et les propositions à comparer.`],
      [`Faire connaissance avec l’équipe de ${name} permet de savoir à qui confier votre prochain projet de voyage. Les conseillers peuvent partir de vos premières idées pour organiser une recherche plus précise${city ? ` depuis ${agencyAtCity}` : ""}.`, `Avant votre échange, réunir les périodes de départ envisagées, le nombre de voyageurs, le budget et vos priorités aide à cadrer la demande. L’agence peut ensuite étudier les solutions correspondant à ces critères.`],
      [`L’équipe de ${name}${city ? ` vous accueille à ${city}` : ""} pour transformer une envie de départ en projet concret. Cette présentation complète les coordonnées et informations pratiques disponibles sur le mini-site.`, `Un premier échange est plus efficace lorsque les dates, le budget et le style de voyage souhaité sont déjà identifiés, même approximativement. Les conseillers peuvent alors concentrer leurs recherches sur les options les plus pertinentes.`],
    ],
    partners: [
      [`Les partenaires référencés par ${name} illustrent les différentes solutions que l’équipe peut étudier pour construire un voyage. Selon le projet, plusieurs voyagistes ou marques peuvent répondre à des attentes différentes.`, `Destination, période, budget, formule et niveau de prestations sont autant de critères utiles pour comparer ces offres. Le rôle de l’agence est de mettre ces éléments en perspective plutôt que de limiter la recherche à une seule marque.`],
      [`Cette sélection donne un aperçu des voyagistes avec lesquels ${name} peut rechercher des solutions. Elle ne remplace pas l’étude personnalisée menée${city ? ` par ${agencyAtCity}` : " par l’agence"}, qui dépend des critères propres à chaque voyage.`, `Une même destination peut être proposée avec des durées, hébergements, transports ou services très différents. Comparer les partenaires permet donc d’examiner les offres au regard de vos dates, de votre budget et de vos priorités.`],
      [`Pour élargir les possibilités de voyage, ${name} s’appuie sur plusieurs partenaires et spécialistes. Cette diversité permet d’étudier différentes formules avant de retenir celle qui correspond le mieux à votre projet.`, `Le choix se fait notamment en fonction de la destination, des disponibilités, du niveau de confort recherché et des prestations incluses. Les conseillers${city ? ` de ${agencyAtCity}` : " de l’agence"} peuvent vous aider à lire ces différences et à comparer les propositions pertinentes.`],
    ],
    reviews: [
      [`Les avis publiés au sujet de ${name} permettent de découvrir l’expérience de voyageurs ayant déjà sollicité l’équipe${city ? ` à ${city}` : ""}. Ils apportent un éclairage complémentaire aux informations pratiques et aux services présentés sur le mini-site.`, `Ces retours peuvent vous aider à préparer votre prise de contact et à comprendre la manière dont l’agence accompagne les projets. Pour votre propre voyage, l’étude reste naturellement adaptée à vos dates, votre budget et vos attentes.`],
      [`Avant de confier un projet à ${name}, les témoignages de clients donnent un aperçu concret de leur expérience avec ${agencyAtCity}. Cette page les rassemble pour faciliter leur consultation.`, `Les avis constituent un point de repère parmi d’autres : vous pouvez également consulter les services, l’équipe et les inspirations de voyage avant de présenter votre demande et d’obtenir un accompagnement adapté à votre projet.`],
      [`Cette page réunit les retours laissés par des clients de ${name}. Ils permettent d’apprécier l’expérience vécue avec ${agencyAtCity} et complètent la présentation de l’équipe et de ses services.`, `Pour préparer votre voyage, ces témoignages peuvent être mis en regard des informations du mini-site avant un échange avec un conseiller. Votre demande sera ensuite étudiée selon vos propres contraintes et priorités.`],
    ],
  };
  const fallback = [[`${clean(pageTitle) || "Cette page"} complète les informations proposées par ${name}${city ? ` à ${city}` : ""}. Elle aide à situer ce sujet dans la préparation d’un projet de voyage avant de poursuivre vers les services correspondants.`, `Dates, budget et priorités constituent des repères utiles pour préciser la recherche et comparer les solutions disponibles avant de contacter l’agence.`]];
  return profiles[profile] || fallback;
}
function titleForProfile(profile, { name, city } = {}, seed = "") {
  const titles = {
    team: city ? [`Rencontrez notre équipe à ${city}`, `Votre équipe voyage à ${city}`, `Des conseillers pour votre projet à ${city}`] : ["Rencontrez notre équipe"],
    partners: city ? [`Nos partenaires voyage à ${city}`, "Des partenaires sélectionnés pour vos voyages", `Comparer les solutions avec notre agence ${deCity(city)}`] : ["Nos partenaires voyage"],
    reviews: city ? [`Les avis sur notre agence ${deCity(city)}`, `L’expérience de nos clients à ${city}`, "Ce que nos clients disent de l’agence"] : ["Les avis de nos clients"],
  };
  const values = titles[profile] || [`Informations utiles avec ${name}`];
  return values[stableIndex(`${seed}:title`, values.length)];
}
function paragraphsForProfile(profile, context = {}) {
  const variants = variantsForProfile(profile, context);
  const seed = `${context.name || ""}|${context.city || ""}|${context.pageTitle || ""}|${profile}`;
  const selected = variants[stableIndex(seed, variants.length)] || variants[0] || [];
  const label = clean(context.intentLabel);
  if (label && !selected.join(" ").toLowerCase().includes(label.toLowerCase())) return [...selected, `Votre recherche peut aussi être précisée autour de « ${label} » lorsque cette intention correspond au voyage envisagé.`];
  return selected;
}
function selectParagraphs(paragraphs = [], missingWords = 0) { if (!paragraphs.length) return []; if (Number(missingWords || 0) <= 35) return [paragraphs[0]]; if (Number(missingWords || 0) <= 80) return paragraphs.slice(0, 2); return paragraphs.slice(0, 3); }
function buildBodyCopyPreview({ agency = {}, page = {}, action = {} } = {}) {
  if (!(action.recommendedFields || []).includes("body")) return null;
  const identity = agencyIdentity(agency);
  const profile = pageProfile(page);
  const seed = `${agency.id || agency.agencyId || identity.name}|${page.slug || page.title || "home"}|${profile}`;
  const paragraphs = paragraphsForProfile(profile, { ...identity, pageTitle: page.title, intentLabel: action.intentQuality?.label || null });
  const selected = selectParagraphs(paragraphs, action.thinContent?.missingWords || 0);
  return { generatedBy: "mse-25.31", purpose: "local-seo-quality-uplift", profile, variantIndex: stableIndex(seed, Math.max(1, variantsForProfile(profile, { ...identity, pageTitle: page.title }).length)), sourceFacts: { agencyName: identity.name, city: identity.city || null, pageSlug: page.slug || null, pageTitle: page.title || null, intent: action.intentQuality?.intent || null }, factualPolicy: "agency-and-page-context-only", title: titleForProfile(profile, identity, seed), html: selected.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join(""), paragraphCount: selected.length };
}
module.exports = { agencyIdentity, buildBodyCopyPreview, deCity, pageProfile, paragraphsForProfile, selectParagraphs, stableIndex, titleForProfile, variantsForProfile, rotate };
