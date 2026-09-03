import Link from "next/link";
import { resolvedTargetCities } from "../../lib/seo/local-area-config";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function targetCities(site) {
  return resolvedTargetCities(site, { limit: 6 });
}

function joinCities(values) {
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} et ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} et ${values[values.length - 1]}`;
}

export default function LocalSeoAreaLinks({ site }) {
  const agency = site?.agency || {};
  const city = clean(agency.city || site?.city);
  const nearby = targetCities(site);

  if (!city || !nearby.length) return null;

  const basePath = clean(site?.basePath) || `/agence/${encodeURIComponent(site?.slug || "")}`;
  const root = basePath.replace(/\/$/, "");
  const closeArea = nearby.slice(0, 3);
  const extendedArea = nearby.slice(3);

  return (
    <section className="public-site-section" aria-labelledby="local-area-title">
      <div className="public-site-container public-site-prose">
        <p className="public-site-eyebrow">Votre agence de proximité</p>
        <h2 id="local-area-title">Votre agence de voyages à {city} et dans les communes voisines</h2>
        <p>
          Installée à {city}, notre agence accompagne aussi les voyageurs de {joinCities(closeArea)}
          pour préparer séjours, circuits, croisières, autotours et voyages sur mesure. Vous pouvez
          échanger avec un conseiller qui suit votre projet depuis les premières recherches jusqu’au retour.
        </p>
        {extendedArea.length ? (
          <p>
            Notre secteur de proximité s’étend également à {joinCities(extendedArea)} : vous pouvez
            contacter l’équipe de {city} pour une recherche, un devis ou un rendez-vous en agence.
          </p>
        ) : null}
        <div className="public-site-related-links" aria-label={`Découvrir l’agence de voyages de ${city}`}>
          <Link href={`${root}/services`}>Services de l’agence de voyages de {city}</Link>
          <Link href={`${root}/destinations`}>Destinations conseillées depuis {city}</Link>
          <Link href={`${root}/inspiration`}>Conseils et inspirations voyage à {city}</Link>
          <Link href={`${root}/contact`}>Contacter l’agence de voyages de {city}</Link>
        </div>
      </div>
    </section>
  );
}

export { joinCities, targetCities };
