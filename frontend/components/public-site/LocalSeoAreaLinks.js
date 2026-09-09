import Link from "next/link";
import PublicAgencyReferenceFacts from "./PublicAgencyReferenceFacts";
import {
  resolvedExtendedTargetCities,
  resolvedTargetCities,
} from "../../lib/seo/local-area-config";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function targetCities(site) {
  return resolvedTargetCities(site, { limit: 6 });
}

function extendedTargetCities(site) {
  return resolvedExtendedTargetCities(site, { limit: 4 });
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
  const extended = extendedTargetCities(site);

  if (!city || !nearby.length) {
    return <PublicAgencyReferenceFacts site={site} />;
  }

  const basePath = clean(site?.basePath) || `/agence/${encodeURIComponent(site?.slug || "")}`;
  const root = basePath.replace(/\/$/, "");
  const closeArea = nearby.slice(0, 3);
  const extendedArea = nearby.slice(3);

  return (
    <>
      <section className="public-site-section" aria-labelledby="local-area-title">
        <div className="public-site-container public-site-prose">
          <p className="public-site-eyebrow">Zone locale publiée</p>
          <h2 id="local-area-title">Votre agence de voyages à {city} et les secteurs présentés sur ce mini-site</h2>
          <p>
            L’agence est implantée à {city}. Ce mini-site présente également l’agence pour les secteurs de {joinCities(closeArea)}.
          </p>
          {extendedArea.length ? (
            <p>
              Les autres secteurs de proximité publiés sur ce mini-site sont {joinCities(extendedArea)}.
            </p>
          ) : null}
          {extended.length ? (
            <p>
              Une zone locale élargie est également présentée pour {joinCities(extended)}. Ces communes complètent
              le contexte géographique du mini-site sans modifier l’adresse d’implantation de l’agence à {city}.
            </p>
          ) : null}
          <div className="public-site-related-links" aria-label={`Découvrir l’agence de voyages de ${city}`}>
            <Link href={`${root}/services`}>Services publiés par l’agence de {city}</Link>
            <Link href={`${root}/destinations`}>Destinations publiées depuis {city}</Link>
            <Link href={`${root}/inspiration`}>Conseils et inspirations publiés depuis {city}</Link>
            <Link href={`${root}/contact`}>Coordonnées de l’agence de {city}</Link>
          </div>
        </div>
      </section>
      <PublicAgencyReferenceFacts site={site} />
    </>
  );
}

export { extendedTargetCities, joinCities, targetCities };
