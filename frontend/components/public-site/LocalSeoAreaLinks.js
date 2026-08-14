import Link from "next/link";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function targetCities(site) {
  const agency = site?.agency || {};
  const primaryCity = clean(agency.city || site?.city).toLocaleLowerCase("fr-FR");
  const values = site?.targetCities || site?.metadata?.targetCities || agency?.targetCities || [];

  if (!Array.isArray(values)) return [];

  const seen = new Set();
  const result = [];

  for (const value of values) {
    const city = clean(typeof value === "string" ? value : value?.name || value?.city);
    if (!city) continue;

    const key = city.toLocaleLowerCase("fr-FR");
    if (key === primaryCity || seen.has(key)) continue;

    seen.add(key);
    result.push(city);
  }

  return result.slice(0, 6);
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

  return (
    <section className="public-site-section" aria-labelledby="local-area-title">
      <div className="public-site-container public-site-prose">
        <p className="public-site-eyebrow">Votre agence de proximité</p>
        <h2 id="local-area-title">Une agence de voyages à {city} pour tout le secteur</h2>
        <p>
          Notre équipe accompagne les voyageurs de {city} ainsi que de {joinCities(nearby)}.
          Vous bénéficiez du même conseil personnalisé pour vos séjours, circuits, croisières
          et voyages sur mesure, avec un interlocuteur local avant, pendant et après le départ.
        </p>
        <div className="public-site-related-links" aria-label="Découvrir les services de l’agence">
          <Link href={`${root}/services`}>Découvrir nos services voyage</Link>
          <Link href={`${root}/destinations`}>Voir nos idées de destinations</Link>
          <Link href={`${root}/contact`}>Contacter l’agence de {city}</Link>
        </div>
      </div>
    </section>
  );
}

export { joinCities, targetCities };
