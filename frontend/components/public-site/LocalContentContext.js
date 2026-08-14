import Link from "next/link";
import { resolvedTargetCities } from "../../lib/seo/local-area-config";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function joinCities(values) {
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} et ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} et ${values[values.length - 1]}`;
}

const COPY = {
  services: (city) => ({
    title: `Des conseils voyage personnalisés à ${city}`,
    text: "Notre équipe vous aide à comparer les solutions adaptées à votre projet : séjours, circuits, croisières, autotours et voyages sur mesure. Le conseil en agence permet de construire un voyage cohérent avec vos envies, votre budget et votre façon de voyager.",
  }),
  destinations: (city) => ({
    title: `Choisir votre prochaine destination avec votre agence de ${city}`,
    text: "Une destination ne se choisit pas uniquement sur une photo ou un prix. Saisonnalité, durée de vol, rythme du séjour, formalités et type d’hébergement comptent aussi. Nos conseillers vous accompagnent pour identifier les destinations réellement adaptées à votre projet.",
  }),
  offers: (city) => ({
    title: `Trouver une offre de voyage avec votre agence de ${city}`,
    text: "Nos offres sont une sélection de possibilités disponibles au moment de leur publication. Votre conseiller peut vérifier les disponibilités, comparer les prestations et rechercher d’autres solutions selon vos dates, votre budget et vos préférences.",
  }),
  reviews: (city) => ({
    title: `Pourquoi confier votre voyage à une agence locale à ${city} ?`,
    text: "Les avis de nos voyageurs reflètent l’importance de l’écoute, du conseil et du suivi. Notre équipe reste votre interlocuteur pour préparer le dossier, répondre à vos questions et vous accompagner avant, pendant et après votre voyage.",
  }),
  team: (city) => ({
    title: `Votre conseiller voyage de proximité à ${city}`,
    text: "Connaître votre projet permet de proposer autre chose qu’une simple liste de prix. Notre équipe prend le temps d’échanger sur vos attentes afin de construire un voyage adapté et de rester disponible jusqu’à votre retour.",
  }),
  contact: (city) => ({
    title: `Préparez votre voyage avec notre agence à ${city}`,
    text: "Contactez l’agence pour un conseil, une recherche de séjour ou un projet sur mesure. Plus vous nous précisez vos dates, votre budget, le nombre de voyageurs et vos envies, plus nous pouvons orienter efficacement la recherche.",
  }),
};

export default function LocalContentContext({ site, kind, quality }) {
  const agency = site?.agency || {};
  const city = clean(agency.city || site?.city);
  const builder = COPY[kind];
  if (!city || !builder) return null;
  if (quality?.strong && !quality?.needsLocalContext) return null;

  const nearby = resolvedTargetCities(site, { limit: 4 });
  const copy = builder(city);
  const root = clean(site?.basePath) || `/agence/${encodeURIComponent(site?.slug || "")}`;

  return (
    <section className="public-site-section public-site-local-context" aria-labelledby="local-context-title">
      <div className="public-site-container public-site-prose">
        <p className="public-site-eyebrow">Conseil local Mondescale</p>
        <h2 id="local-context-title">{copy.title}</h2>
        <p>{copy.text}</p>
        {nearby.length ? (
          <p>
            L’agence accompagne également les voyageurs de {joinCities(nearby)} pour leurs projets de vacances et de voyages.
          </p>
        ) : null}
        <div className="public-site-related-links" aria-label={`Poursuivre votre projet avec l’agence de voyages de ${city}`}>
          {kind !== "services" ? (
            <Link href={`${root}/services`}>Services de notre agence de voyages à {city}</Link>
          ) : null}
          {kind !== "destinations" ? (
            <Link href={`${root}/destinations`}>Destinations conseillées par notre agence à {city}</Link>
          ) : null}
          <Link href={`${root}/inspiration`}>Conseils et inspirations voyage depuis {city}</Link>
          {kind !== "contact" ? (
            <Link href={`${root}/contact`}>Contacter notre agence de voyages à {city}</Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
