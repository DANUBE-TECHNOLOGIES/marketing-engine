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
  services: ({ city, nearby }) => ({
    title: `Des conseils voyage personnalisés à ${city}`,
    text: nearby.length
      ? `Depuis ${city}, notre équipe accompagne aussi les voyageurs de ${joinCities(nearby.slice(0, 2))}. Séjours, circuits, croisières, autotours ou voyages sur mesure : nous comparons les solutions selon vos dates, votre budget et votre façon de voyager.`
      : `À ${city}, notre équipe vous accompagne pour comparer séjours, circuits, croisières, autotours et voyages sur mesure selon vos dates, votre budget et votre façon de voyager.`,
  }),
  destinations: ({ city, nearby }) => ({
    title: `Choisir votre prochaine destination avec votre agence de ${city}`,
    text: nearby.length
      ? `Pour les voyageurs de ${city} et du secteur de ${joinCities(nearby.slice(0, 2))}, nous comparons les destinations selon la saison, la durée du trajet, le rythme recherché, les formalités et le type d’hébergement. L’objectif est de retenir une destination adaptée au projet, pas seulement une offre attractive.`
      : `À ${city}, nous comparons les destinations selon la saison, la durée du trajet, le rythme recherché, les formalités et le type d’hébergement afin de retenir une solution réellement adaptée à votre projet.`,
  }),
  offers: ({ city, nearby }) => ({
    title: `Trouver une offre de voyage avec votre agence de ${city}`,
    text: nearby.length
      ? `Notre agence de ${city} recherche pour les voyageurs du secteur, notamment ${joinCities(nearby.slice(0, 2))}, des solutions correspondant à leurs dates et à leur budget. Les offres publiées servent de point de départ : votre conseiller peut contrôler les disponibilités et comparer d’autres possibilités.`
      : `Notre agence de ${city} vérifie les disponibilités et compare les prestations selon vos dates, votre budget et vos préférences ; les offres publiées constituent un point de départ pour votre recherche.`,
  }),
  reviews: ({ city, nearby }) => ({
    title: `Pourquoi confier votre voyage à une agence locale à ${city} ?`,
    text: nearby.length
      ? `Les voyageurs de ${city}, ${joinCities(nearby.slice(0, 2))} et des communes voisines peuvent compter sur un interlocuteur de proximité pour préparer leur dossier. Les avis clients témoignent notamment de l’écoute, du conseil et du suivi apportés avant, pendant et après le voyage.`
      : `À ${city}, les avis de nos voyageurs témoignent de l’importance d’un interlocuteur de proximité pour le conseil, la préparation du dossier et le suivi avant, pendant et après le voyage.`,
  }),
  team: ({ city, nearby }) => ({
    title: `Votre conseiller voyage de proximité à ${city}`,
    text: nearby.length
      ? `Notre équipe de ${city} reçoit et accompagne également les voyageurs venant de ${joinCities(nearby.slice(0, 2))}. Chaque projet commence par un échange sur vos attentes afin de construire une proposition adaptée et de conserver un interlocuteur jusqu’à votre retour.`
      : `Notre équipe de ${city} prend le temps d’échanger sur vos attentes afin de construire une proposition adaptée et de rester votre interlocuteur jusqu’à votre retour.`,
  }),
  contact: ({ city, nearby }) => ({
    title: `Préparez votre voyage avec notre agence à ${city}`,
    text: nearby.length
      ? `Vous habitez ${city}, ${joinCities(nearby.slice(0, 2))} ou une commune voisine ? Contactez l’agence avec vos dates, votre budget, le nombre de voyageurs et vos premières envies : ces informations nous permettent d’orienter efficacement la recherche.`
      : `Contactez notre agence de ${city} avec vos dates, votre budget, le nombre de voyageurs et vos premières envies afin que nous puissions orienter efficacement votre recherche.`,
  }),
};

export default function LocalContentContext({ site, kind, quality }) {
  const agency = site?.agency || {};
  const city = clean(agency.city || site?.city);
  const builder = COPY[kind];
  if (!city || !builder) return null;
  if (quality?.strong && !quality?.needsLocalContext) return null;

  const nearby = resolvedTargetCities(site, { limit: 4 });
  const copy = builder({ city, nearby });
  const root = clean(site?.basePath) || `/agence/${encodeURIComponent(site?.slug || "")}`;

  return (
    <section className="public-site-section public-site-local-context" aria-labelledby="local-context-title">
      <div className="public-site-container public-site-prose">
        <p className="public-site-eyebrow">Conseil local Mondescale</p>
        <h2 id="local-context-title">{copy.title}</h2>
        <p>{copy.text}</p>
        {nearby.length > 2 ? (
          <p>
            Notre zone de proximité comprend également {joinCities(nearby.slice(2))}.
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
