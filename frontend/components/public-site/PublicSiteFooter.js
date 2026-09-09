import Link from "next/link";
import { absoluteUrl } from "../../lib/seo/site-url";
import {
  pageHref,
  pageSlug,
  uniquePublishedNavigation,
} from "./PublicSiteHeader";

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

const FOOTER_PUBLIC_PAGE_SLUGS = new Set([
  "services",
  "destinations",
  "inspiration",
  "avis",
  "contact",
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
  return new Set(
    uniquePublishedNavigation(site)
      .map((page) => pageSlug(page))
      .filter(Boolean)
  );
}

function publishedFooterPages(site) {
  return uniquePublishedNavigation(site).filter((page) => FOOTER_PUBLIC_PAGE_SLUGS.has(pageSlug(page)));
}

function localAnchor(label, city) {
  const locality = String(city || "").trim();
  return locality ? `${label} à ${locality}` : label;
}

function canonicalAgencyEntityId(site) {
  const basePath = site?.basePath || `/agence/${encodeURIComponent(site?.slug || "")}`;
  return `${absoluteUrl(basePath)}#travel-agency`;
}

function factualAgencyFooterDescription(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  return city
    ? `Retrouvez les coordonnées publiques et les contenus publiés par votre agence de voyages à ${city}.`
    : "Retrouvez les coordonnées publiques et les contenus publiés par votre agence de voyages.";
}

export default function PublicSiteFooter({ site }) {
  const agency = site.agency || {};
  const basePath = `/agence/${site.slug}`;
  const footerPages = publishedFooterPages(site);
  const city = agency.city || site.city;
  const agencyEntityId = canonicalAgencyEntityId(site);

  return (
    <footer
      className="public-site-footer"
      itemScope
      itemType="https://schema.org/TravelAgency"
      itemID={agencyEntityId}
      data-geo-reference="canonical-agency-footer"
    >
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
            <strong itemProp="name">{site.name}</strong>
            <p>{factualAgencyFooterDescription(site)}</p>
          </div>
        </div>

        <div>
          <h3>Votre agence</h3>

          <address
            className="public-site-footer-address"
            itemProp="address"
            itemScope
            itemType="https://schema.org/PostalAddress"
          >
            <strong>{site.name}</strong>

            {agency.address ? (
              <span>
                <span itemProp="streetAddress">{agency.address}</span>
                <br />
                <span itemProp="postalCode">{agency.postalCode}</span>{" "}
                <span itemProp="addressLocality">{agency.city}</span>
                <meta itemProp="addressCountry" content="FR" />
              </span>
            ) : null}

            {agency.phone ? (
              <a itemProp="telephone" href={telephoneHref(agency.phone)}>{agency.phone}</a>
            ) : null}

            {agency.email ? (
              <a itemProp="email" href={`mailto:${agency.email}`}>{agency.email}</a>
            ) : null}
          </address>
        </div>

        <div>
          <h3>Pages publiées</h3>

          <div className="public-site-footer-links">
            {footerPages.map((page) => (
              <Link key={pageSlug(page)} href={pageHref(site.slug, page)}>
                {page.title}
              </Link>
            ))}
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
        <span>Coordonnées et contenus publiés par l’agence</span>
      </div>
    </footer>
  );
}

export {
  FOOTER_ALIASES,
  FOOTER_PUBLIC_PAGE_SLUGS,
  SOCIAL_LINKS,
  canonicalAgencyEntityId,
  canonicalFooterSlug,
  factualAgencyFooterDescription,
  localAnchor,
  publishedFooterPages,
  publishedNavigationSlugs,
  telephoneHref,
};
