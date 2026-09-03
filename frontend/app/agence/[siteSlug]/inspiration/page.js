import Link from "next/link";
import { notFound } from "next/navigation";

import JsonLd from "../../../../components/JsonLd";
import { publicSiteApi } from "../../../../lib/public-site-api";
import {
  buildBreadcrumbSchema,
  buildLocalWebPageSchema,
  buildTravelAgencySchema,
} from "../../../../lib/seo/json-ld";
import {
  buildLocalPageSeo,
} from "../../../../lib/seo/local-page-seo";
import {
  resolvedTargetCities,
} from "../../../../lib/seo/local-area-config";
import "./inspiration-index.css";

const PUBLIC_ORIGIN = String(
  process.env.NEXT_PUBLIC_SITE_ORIGIN ||
    "https://agences.mondescale.com"
).replace(/\/+$/g, "");

function canonicalPath(siteSlug) {
  return `/agence/${encodeURIComponent(siteSlug)}/inspiration`;
}

function formatPublishedDate(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return {
    iso: date.toISOString(),
    label: new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date),
  };
}

function inspirationSeo(site) {
  return buildLocalPageSeo({
    site,
    page: {
      slug: "inspiration",
      title: "Inspirations voyage",
    },
    pageSlug: "inspiration",
  });
}

function inspirationHeading(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  return city
    ? `Inspirations voyage depuis ${city}`
    : "Inspirations voyage";
}

function inspirationIntroduction(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  const nearby = resolvedTargetCities(site, { limit: 3 });
  const local = city
    ? `Des idées de destinations, des conseils et des expériences sélectionnés par votre agence ${site.name} à ${city} pour préparer votre prochain voyage.`
    : `Des idées de destinations, des conseils et des expériences sélectionnés par votre agence ${site.name} pour préparer votre prochain voyage.`;

  return nearby.length
    ? `${local} Notre équipe accompagne aussi les voyageurs de ${nearby.join(", ")}.`
    : local;
}

export async function generateMetadata({ params }) {
  const { siteSlug } = await params;

  try {
    const site = await publicSiteApi.getSite(siteSlug);
    const agencyId = site?.agencyId || site?.agency?.id || null;
    const items = await publicSiteApi.getInspirations({
      limit: 1,
      channel: "article",
      agencyId,
    });
    const hasPublicInspirations = items.length > 0;
    const seo = inspirationSeo(site);
    const canonical = `${PUBLIC_ORIGIN}${canonicalPath(siteSlug)}`;

    return {
      title: seo.title,
      description: seo.description,
      alternates: { canonical },
      robots: {
        index: hasPublicInspirations,
        follow: true,
        googleBot: {
          index: hasPublicInspirations,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
      openGraph: {
        title: seo.title,
        description: seo.description,
        url: canonical,
        type: "website",
        locale: "fr_FR",
        siteName: site.name,
        images: seo.image ? [{ url: seo.image }] : undefined,
      },
      twitter: {
        card: seo.image ? "summary_large_image" : "summary",
        title: seo.title,
        description: seo.description,
        images: seo.image ? [seo.image] : undefined,
      },
    };
  } catch (error) {
    if (error?.statusCode === 404) {
      return { robots: { index: false, follow: false } };
    }
    throw error;
  }
}

export default async function InspirationIndexPage({ params }) {
  const { siteSlug } = await params;

  let site;
  let items;

  try {
    site = await publicSiteApi.getSite(siteSlug);
    const agencyId = site?.agencyId || site?.agency?.id || null;
    items = await publicSiteApi.getInspirations({
      limit: 24,
      channel: "article",
      agencyId,
    });
  } catch (error) {
    if (error?.statusCode === 404) notFound();
    throw error;
  }

  const canonical = `${PUBLIC_ORIGIN}${canonicalPath(siteSlug)}`;
  const homePath = `/agence/${encodeURIComponent(siteSlug)}`;
  const contactPath = `${homePath}/contact`;
  const servicesPath = `${homePath}/services`;
  const destinationsPath = `${homePath}/destinations`;
  const seo = inspirationSeo(site);
  const breadcrumb = buildBreadcrumbSchema([
    { name: "Accueil", path: site.basePath },
    { name: "Inspirations voyage", path: canonical },
  ]);
  const webPage = buildLocalWebPageSchema({
    site,
    page: {
      slug: "inspiration",
      title: "Inspirations voyage",
    },
    url: canonical,
    title: seo.title,
    description: seo.description,
  });

  return (
    <>
      <JsonLd data={buildTravelAgencySchema(site)} />
      <JsonLd data={breadcrumb} />
      <JsonLd data={webPage} />

      <section className="public-site-section">
        <div className="public-site-container public-site-prose">
          <nav aria-label="Fil d’Ariane" className="public-site-breadcrumb">
            <Link href={homePath}>Accueil de {site.name}</Link>
            <span aria-hidden="true">›</span>
            <span>Inspirations voyage</span>
          </nav>

          <p className="public-site-eyebrow">Idées & conseils</p>
          <h1>{inspirationHeading(site)}</h1>
          <p>{inspirationIntroduction(site)}</p>
        </div>
      </section>

      <section className="public-site-section">
        <div className="public-site-container">
          {items.length ? (
            <div className="public-inspiration-grid">
              {items.map((item) => {
                const slug = String(item?.slug || "").trim();
                if (!slug) return null;

                const itemSeo = item?.seo && typeof item.seo === "object" ? item.seo : {};
                const body = item?.body && typeof item.body === "object" ? item.body : {};
                const image =
                  body.imageUrl ||
                  body.heroImage ||
                  body.hero?.imageUrl ||
                  itemSeo.openGraph?.image ||
                  itemSeo.openGraph?.imageUrl ||
                  null;
                const title = String(item.title || "Cette inspiration").trim();
                const published = formatPublishedDate(
                  item.publishedAt || item.createdAt
                );
                const articlePath = `${canonicalPath(siteSlug)}/${encodeURIComponent(slug)}`;

                return (
                  <article className="public-inspiration-card" key={item.id || slug}>
                    {image ? (
                      <div className="public-inspiration-card-media">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image} alt={body.imageAlt || title} loading="lazy" />
                      </div>
                    ) : null}
                    <div className="public-inspiration-card-body">
                      <p className="public-site-eyebrow">Inspiration</p>
                      <h2>
                        <Link className="public-inspiration-card-title-link" href={articlePath}>
                          {title}
                        </Link>
                      </h2>
                      {published ? (
                        <p className="public-site-content-date">
                          Publié le{" "}
                          <time dateTime={published.iso}>
                            {published.label}
                          </time>
                        </p>
                      ) : null}
                      {item.excerpt ? (
                        <p className="public-inspiration-card-excerpt">{item.excerpt}</p>
                      ) : null}
                      <span className="public-inspiration-card-cta" aria-hidden="true">
                        Lire l’article
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="public-site-card">
              <h2>De nouvelles inspirations arrivent bientôt</h2>
              <p>
                Votre agence prépare actuellement de nouvelles idées de voyages.
                Contactez-nous pour construire dès maintenant votre prochain départ.
              </p>
              <Link href={contactPath}>
                Contacter l’agence
              </Link>
            </div>
          )}

          <div className="public-site-related-links" aria-label="Liens utiles">
            <Link href={homePath}>Découvrir votre agence {site.name}</Link>
            <Link href={destinationsPath}>Explorer nos destinations</Link>
            <Link href={servicesPath}>Découvrir nos services voyage</Link>
            <Link href={contactPath}>Parler de votre projet de voyage</Link>
          </div>
        </div>
      </section>
    </>
  );
}

export {
  canonicalPath,
  formatPublishedDate,
  inspirationHeading,
  inspirationIntroduction,
  inspirationSeo,
};