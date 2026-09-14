import Link from "next/link";
import { extractPublishedServices } from "../../lib/seo/json-ld";
import { resolvedTargetCities } from "../../lib/seo/local-area-config";
import { pageHref, pageSlug, uniquePublicNavigation } from "./PublicSiteHeader";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function joinCities(values) {
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} et ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} et ${values[values.length - 1]}`;
}

function publishedServiceNames(page) {
  return extractPublishedServices(page)
    .map((service) => clean(service?.name))
    .filter(Boolean);
}

function publishedContextNavigation(site, currentPage, limit = 4) {
  const currentSlug = pageSlug(currentPage);
  return uniquePublicNavigation(site)
    .filter((candidate) => pageSlug(candidate) !== currentSlug)
    .slice(0, limit)
    .map((candidate) => ({
      title: candidate.title,
      href: pageHref(site.slug, candidate),
    }));
}

function localAreaSentence(city, nearby) {
  return nearby.length
    ? `Ce mini-site présente également l’agence pour les secteurs de ${joinCities(nearby.slice(0, 2))}, en complément de son implantation à ${city}.`
    : `Ce mini-site présente l’agence implantée à ${city}.`;
}

const COPY = {
  agency: ({ city, nearby }) => ({
    title: `Repères sur votre agence à ${city}`,
    text: `${localAreaSentence(city, nearby)} Retrouvez sur cette page les informations publiées sur l’agence et les moyens de la contacter.`,
  }),
  services: ({ city, nearby, services }) => {
    const published = services.slice(0, 4);
    const serviceSentence = published.length
      ? `Les services actuellement publiés sur cette page comprennent ${joinCities(published)}.`
      : "Cette page présente les services actuellement publiés par l’agence.";

    return {
      title: `Services publiés par l’agence de ${city}`,
      text: `${localAreaSentence(city, nearby)} ${serviceSentence} Contactez l’agence pour préciser votre projet et obtenir les informations correspondant à votre demande.`,
    };
  },
  destinations: ({ city, nearby }) => ({
    title: `Destinations publiées par l’agence de ${city}`,
    text: `${localAreaSentence(city, nearby)} Cette page rassemble les destinations actuellement publiées sur le mini-site ; chaque fiche présente les informations éditoriales disponibles pour préparer votre projet.`,
  }),
  inspirations: ({ city, nearby }) => ({
    title: `Inspirations voyage publiées depuis ${city}`,
    text: `${localAreaSentence(city, nearby)} Les contenus affichés ici correspondent aux conseils et inspirations actuellement publiés sur le mini-site de l’agence.`,
  }),
  offers: ({ city, nearby }) => ({
    title: `Offres voyage publiées à ${city}`,
    text: `${localAreaSentence(city, nearby)} Cette page présente les offres actuellement publiées ; contactez l’agence pour toute information complémentaire relative à votre projet.`,
  }),
  reviews: ({ city, nearby }) => ({
    title: `Avis publiés pour l’agence de ${city}`,
    text: `${localAreaSentence(city, nearby)} Cette page présente les avis publics associés à l’agence selon la source indiquée sur le mini-site.`,
  }),
  team: ({ city, nearby }) => ({
    title: `Équipe présentée par l’agence de ${city}`,
    text: `${localAreaSentence(city, nearby)} Retrouvez les conseillers présentés par l’agence et les informations publiées sur leur rôle et leur parcours.`,
  }),
  commitments: ({ city, nearby }) => ({
    title: `Engagements publiés par l’agence de ${city}`,
    text: `${localAreaSentence(city, nearby)} Cette page présente les engagements et informations actuellement publiés par l’agence ; elle ne complète pas ces éléments par des promesses de service non renseignées.`,
  }),
  partners: ({ city, nearby }) => ({
    title: `Partenaires voyage publiés à ${city}`,
    text: `${localAreaSentence(city, nearby)} Cette page présente les partenaires actuellement publiés dans le catalogue Mondescale ainsi que, lorsqu’elle existe, la sélection complémentaire configurée pour cette agence.`,
  }),
  contact: ({ city, nearby }) => ({
    title: `Coordonnées publiques de l’agence de ${city}`,
    text: `${localAreaSentence(city, nearby)} Retrouvez les coordonnées publiques de l’agence pour échanger avec un conseiller au sujet de votre projet.`,
  }),
};

export default function LocalContentContext({ site, page, kind, quality }) {
  const agency = site?.agency || {};
  const city = clean(agency.city || site?.city);
  const builder = COPY[kind];
  if (!city || !builder) return null;
  if (quality?.strong && !quality?.needsLocalContext) return null;

  const nearby = resolvedTargetCities(site, { limit: 4 });
  const services = kind === "services" ? publishedServiceNames(page) : [];
  const copy = builder({ city, nearby, services });
  const relatedPages = publishedContextNavigation(site, page);

  return (
    <section className="public-site-section public-site-local-context" aria-labelledby="local-context-title">
      <div className="public-site-container public-site-prose">
        <p className="public-site-eyebrow">Repères locaux Mondescale</p>
        <h2 id="local-context-title">{copy.title}</h2>
        <p>{copy.text}</p>
        {nearby.length > 2 ? (
          <p>
            Ce mini-site présente aussi l’agence pour les secteurs de {joinCities(nearby.slice(2))}.
          </p>
        ) : null}
        {relatedPages.length ? (
          <div className="public-site-related-links" aria-label={`Navigation publique de l’agence de voyages de ${city}`}>
            {relatedPages.map((candidate) => (
              <Link key={candidate.href} href={candidate.href}>{candidate.title}</Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export { COPY, joinCities, localAreaSentence, publishedContextNavigation, publishedServiceNames };
