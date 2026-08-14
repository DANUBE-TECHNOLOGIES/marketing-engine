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

function localAnchor(label, city) {
  const locality = String(city || "").trim();
  return locality ? `${label} à ${locality}` : label;
}

export default function PublicSiteFooter({ site }) {
  const agency = site.agency || {};
  const basePath = `/agence/${site.slug}`;
  const navigationSlugs = publishedNavigationSlugs(site);
  const hasServicesPage = navigationSlugs.has("services");
  const hasDestinationsPage = navigationSlugs.has("destinations");
  const hasReviewsPage = navigationSlugs.has("avis");
  const hasContactPage = navigationSlugs.has("contact");
  const city = agency.city || site.city;

  return (
    <footer className="public-site-footer">
      <div className="public-site-footer-decoration" />

      <div className="public-site-container public-site-footer-main">
        <div className="public-site-footer-brand">
          <span className="public-site-footer-mark">M</span>

          <div>
            <strong>{site.name}</strong>
            <p>
              {city
                ? `Votre agence de voyages à ${city} vous accompagne dans la création de voyages uniques, adaptés à vos envies.`
                : "Votre agence vous accompagne dans la création de voyages uniques, adaptés à vos envies."}
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
              <Link href={`${basePath}/services`}>
                {localAnchor("Services de votre agence de voyages", city)}
              </Link>
            ) : null}
            {hasDestinationsPage ? (
              <Link href={`${basePath}/destinations`}>
                {localAnchor("Destinations conseillées par notre agence", city)}
              </Link>
            ) : null}
            <Link href={`${basePath}/inspiration`}>
              {localAnchor("Inspirations et conseils voyage", city)}
            </Link>
            {hasReviewsPage ? (
              <Link href={`${basePath}/avis`}>
                {localAnchor("Avis clients de notre agence", city)}
              </Link>
            ) : null}
            {hasContactPage ? (
              <Link href={`${basePath}/contact`}>
                {localAnchor("Contacter notre agence de voyages", city)}
              </Link>
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
  localAnchor,
  publishedNavigationSlugs,
  telephoneHref,
};
