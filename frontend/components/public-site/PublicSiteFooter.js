import Link from "next/link";

function telephoneHref(phone) {
  return `tel:${String(phone || "").replace(/\s+/g, "")}`;
}

const FOOTER_ALIASES = Object.freeze({
  home: "",
  accueil: "",
  index: "",
  inspirations: "inspiration",
});

function canonicalFooterSlug(value) {
  const slug = String(value || "").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(FOOTER_ALIASES, slug)
    ? FOOTER_ALIASES[slug]
    : slug;
}

function publishedNavigationSlugs(site) {
  const navigation = Array.isArray(site?.navigation)
    ? site.navigation
    : Array.isArray(site?.navigation?.main)
      ? site.navigation.main
      : [];

  return new Set(
    navigation
      .map((page) => canonicalFooterSlug(page?.slug))
      .filter(Boolean)
  );
}

export default function PublicSiteFooter({ site }) {
  const agency = site.agency || {};
  const basePath = `/agence/${site.slug}`;
  const navigationSlugs = publishedNavigationSlugs(site);
  const hasServicesPage = navigationSlugs.has("services");
  const hasDestinationsPage = navigationSlugs.has("destinations");
  const hasReviewsPage = navigationSlugs.has("avis");
  const hasContactPage = navigationSlugs.has("contact");

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

          <address className="public-site-footer-address">
            <strong>{site.name}</strong>

            {agency.address ? (
              <span>
                {agency.address}
                <br />
                {agency.postalCode} {agency.city}
              </span>
            ) : null}

            {agency.phone ? (
              <a href={telephoneHref(agency.phone)}>{agency.phone}</a>
            ) : null}

            {agency.email ? (
              <a href={`mailto:${agency.email}`}>{agency.email}</a>
            ) : null}
          </address>
        </div>

        <div>
          <h3>Préparer votre voyage</h3>

          <div className="public-site-footer-links">
            {hasServicesPage ? (
              <Link href={`${basePath}/services`}>Nos services</Link>
            ) : null}
            {hasDestinationsPage ? (
              <Link href={`${basePath}/destinations`}>Destinations</Link>
            ) : null}
            <Link href={`${basePath}/inspiration`}>Inspirations voyage</Link>
            {hasReviewsPage ? (
              <Link href={`${basePath}/avis`}>Avis clients</Link>
            ) : null}
            {hasContactPage ? (
              <Link href={`${basePath}/contact`}>Nous contacter</Link>
            ) : null}
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

export {
  FOOTER_ALIASES,
  canonicalFooterSlug,
  publishedNavigationSlugs,
  telephoneHref,
};
