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

const SOCIAL_LINKS = Object.freeze([
  {
    name: "Facebook",
    href: "https://www.facebook.com/MondescaleVoyages/",
    icon: "facebook",
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/mondescale_voyages/",
    icon: "instagram",
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/109186262",
    icon: "linkedin",
  },
]);

function SocialIcon({ icon }) {
  if (icon === "facebook") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.5 8.2V6.5c0-.8.5-1 1-1h2.4V2.1L14.6 2C11.3 2 10 4 10 6.2v2H7v4h3V22h4.5v-9.8h3l.5-4h-3.5Z" />
      </svg>
    );
  }

  if (icon === "instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1.2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.2 8.4H2V22h3.2V8.4ZM3.6 2A1.9 1.9 0 1 0 3.6 5.8 1.9 1.9 0 0 0 3.6 2ZM11 8.4H7.9V22H11v-6.7c0-1.8.3-3.5 2.5-3.5 2.1 0 2.2 2 2.2 3.6V22H19v-7.4c0-3.6-.8-6.5-5.1-6.5-2 0-3.4 1.1-4 2.1H9.8V8.4H11Z" />
    </svg>
  );
}

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

      <div className="public-site-container public-site-social-row" aria-label="Réseaux sociaux Mondescale Voyages">
        <strong>Suivez-nous</strong>
        <div className="public-site-social-links">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.name}
              href={social.href}
              className="public-site-social-link"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Suivre Mondescale Voyages sur ${social.name}`}
              title={social.name}
            >
              <SocialIcon icon={social.icon} />
            </a>
          ))}
        </div>
      </div>

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
  SOCIAL_LINKS,
  canonicalFooterSlug,
  localAnchor,
  publishedNavigationSlugs,
  telephoneHref,
};
