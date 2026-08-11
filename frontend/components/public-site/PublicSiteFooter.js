import Link from "next/link";

function telephoneHref(phone) {
  return `tel:${String(phone || "").replace(/\s+/g, "")}`;
}

export default function PublicSiteFooter({ site }) {
  const agency = site.agency || {};
  const basePath = `/agence/${site.slug}`;

  return (
    <footer className="public-site-footer">
      <div className="public-site-footer-decoration" />

      <div className="public-site-container public-site-footer-main">
        <div className="public-site-footer-brand">
          <span className="public-site-footer-mark">M</span>

          <div>
            <strong>{site.name}</strong>
            <p>
              Votre agence vous accompagne dans la création de voyages uniques,
              adaptés à vos envies.
            </p>
          </div>
        </div>

        <div>
          <h3>Votre agence</h3>

          {agency.address ? (
            <p>
              {agency.address}
              <br />
              {agency.postalCode} {agency.city}
            </p>
          ) : null}

          {agency.phone ? (
            <p>
              <a href={telephoneHref(agency.phone)}>{agency.phone}</a>
            </p>
          ) : null}

          {agency.email ? (
            <p>
              <a href={`mailto:${agency.email}`}>{agency.email}</a>
            </p>
          ) : null}
        </div>

        <div>
          <h3>Préparer votre voyage</h3>

          <div className="public-site-footer-links">
            <Link href={`${basePath}/services`}>Nos services</Link>
            <Link href={`${basePath}/inspiration`}>Inspirations voyage</Link>
            <Link href={`${basePath}/avis`}>Avis clients</Link>
            <Link href={`${basePath}/contact`}>Nous contacter</Link>
          </div>
        </div>

        <div>
          <h3>Informations</h3>

          <div className="public-site-footer-links">
            <Link href={`${basePath}/mentions-legales`}>Mentions légales</Link>
            <Link href={`${basePath}/confidentialite`}>
              Politique de confidentialité
            </Link>
          </div>
        </div>
      </div>

      <div className="public-site-container public-site-footer-bottom">
        <span>© {new Date().getFullYear()} {site.name}</span>
        <span>Voyages, conseils et accompagnement personnalisé</span>
      </div>
    </footer>
  );
}
