import Link from "next/link";
import { getSectionTitle } from "./helpers";

function siteRoot(site) {
  return String(site?.basePath || `/agence/${encodeURIComponent(site?.slug || "")}`).replace(/\/$/, "");
}

export default function MapRenderer({ section, site }) {
  const agency = site?.agency || {};
  const city = String(agency.city || site?.city || "").trim();
  const root = siteRoot(site);
  const query = encodeURIComponent([agency.name || site.name, agency.address, agency.postalCode, agency.city].filter(Boolean).join(" "));
  if (!query) return null;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

  return (
    <section className="public-site-section public-site-map">
      <div className="public-site-container">
        <p className="public-site-section-kicker">Nous trouver</p>
        <h2>{getSectionTitle(section, city ? `Venir dans notre agence de voyages à ${city}` : "Venir à l’agence")}</h2>
        <p className="public-site-section-intro">{city ? `Retrouvez l’adresse de notre agence à ${city}, préparez votre itinéraire et venez échanger directement avec un conseiller sur votre prochain voyage.` : "Retrouvez l’adresse de votre agence et préparez votre itinéraire."}</p>
        <div className="public-site-map-frame"><iframe title={`Carte ${agency.name || site.name}`} src={`https://www.google.com/maps?q=${query}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div>
        <div className="public-site-map-address"><div><strong>{agency.name || site.name}</strong>{agency.address ? <span>{agency.address}, {agency.postalCode} {agency.city}</span> : null}</div><a className="public-site-button public-site-button-outline" href={mapsUrl} target="_blank" rel="noopener noreferrer">Calculer l’itinéraire</a></div>
        <nav className="public-site-related-links" aria-label="Préparer votre visite en agence"><Link href={`${root}/contact`}>Contacter votre agence</Link><Link href={`${root}/equipe`}>Rencontrer notre équipe</Link><Link href={`${root}/services`}>Découvrir nos services voyage</Link></nav>
      </div>
    </section>
  );
}

export { siteRoot };
