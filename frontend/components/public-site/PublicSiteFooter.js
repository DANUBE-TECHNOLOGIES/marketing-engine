import Link from "next/link";

export default function PublicSiteFooter({
  site,
}) {
  const agency = site.agency || {};

  return (
    <footer className="public-site-footer">
      <div className="public-site-container public-site-footer-grid">
        <div>
          <strong>{site.name}</strong>

          {agency.address ? (
            <p>
              {agency.address}
              <br />
              {agency.postalCode} {agency.city}
            </p>
          ) : null}
        </div>

        <div>
          {agency.phone ? (
            <p>
              <a
                href={`tel:${agency.phone.replace(
                  /\s+/g,
                  ""
                )}`}
              >
                {agency.phone}
              </a>
            </p>
          ) : null}

          {agency.email ? (
            <p>
              <a href={`mailto:${agency.email}`}>
                {agency.email}
              </a>
            </p>
          ) : null}
        </div>

        <div className="public-site-footer-links">
          <Link
            href={`/sites/${site.slug}/mentions-legales`}
          >
            Mentions légales
          </Link>

          <Link
            href={`/sites/${site.slug}/confidentialite`}
          >
            Confidentialité
          </Link>
        </div>
      </div>
    </footer>
  );
}
