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
  const area = [...closeArea, ...extendedArea].slice(0, 5);

  /*
   * La home V2 porte déjà sa profondeur locale dans ses PageBlocks.
   * Cette zone conserve l'intention locale et le maillage crawlable sans
   * recréer une seconde grande section éditoriale en fin de page.
   */
  return (
    <section
      className="public-site-section public-site-local-area-compact"
      aria-labelledby="local-area-title"
    >
      <div className="public-site-container public-site-local-area-compact-inner">
        <div className="public-site-local-area-compact-copy">
          <p className="public-site-eyebrow">Votre agence de proximité</p>
          <h2 id="local-area-title">Votre agence à {city} et ses environs</h2>
          <p>
            Nous accompagnons aussi les voyageurs de {joinCities(area)} avec le même conseil
            personnalisé et le même suivi avant, pendant et après le voyage.
          </p>
        </div>

        <nav
          className="public-site-related-links public-site-related-links--compact"
          aria-label={`Découvrir l’agence de voyages de ${city}`}
        >
          <Link href={`${root}/services`}>Nos services</Link>
          <Link href={`${root}/destinations`}>Nos destinations</Link>
          <Link href={`${root}/inspiration`}>Inspirations voyage</Link>
          <Link href={`${root}/contact`}>Contacter l’agence</Link>
        </nav>
      </div>
    </section>
  );
}

export { joinCities, targetCities };
