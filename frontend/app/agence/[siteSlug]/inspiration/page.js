import Link from "next/link";
import { notFound } from "next/navigation";

import JsonLd from "../../../../components/JsonLd";
import { publicSiteApi } from "../../../../lib/public-site-api";
import {
  buildBreadcrumbSchema,
  buildTravelAgencySchema,
} from "../../../../lib/seo/json-ld";

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

export async function generateMetadata({ params }) {
  const { siteSlug } = await params;

  try {
    const site = await publicSiteApi.getSite(siteSlug);
    const city = site?.agency?.city || null;
    const title = city
      ? `Inspirations voyage depuis ${city} | ${site.name}`
      : `Inspirations voyage | ${site.name}`;
    const description = city
      ? `Découvrez les idées de voyages et conseils de ${site.name}, votre agence de voyages à ${city}.`
      : `Découvrez les idées de voyages et conseils de ${site.name}.`;
    const canonical = `${PUBLIC_ORIGIN}${canonicalPath(siteSlug)}`;

    return {
      title,
      description,
      alternates: { canonical },
      robots: { index: true, follow: true },
      openGraph: {
        title,
        description,
        url: canonical,
        type: "website",
        locale: "fr_FR",
        siteName: site.name,
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
  const breadcrumb = buildBreadcrumbSchema([
    { name: "Accueil", path: site.basePath },
    { name: "Inspirations voyage", path: canonical },
  ]);

  return (
    <>
      <JsonLd data={buildTravelAgencySchema(site)} />
      <JsonLd data={breadcrumb} />

      <section className="public-site-section">
        <div className="public-site-container public-site-prose">
          <nav aria-label="Fil d’Ariane" className="public-site-breadcrumb">
            <Link href={homePath}>Accueil de {site.name}</Link>
            <span aria-hidden="true">›</span>
            <span>Inspirations voyage</span>
          </nav>

          <p className="public-site-eyebrow">Idées & conseils</p>
          <h1>Inspirations voyage</h1>
          <p>
            Des idées de destinations, des conseils et des expériences sélectionnés
            par votre agence {site.name} pour préparer votre prochain voyage.
          </p>
        </div>
      </section>

      <section className="public-site-section">
        <div className="public-site-container">
          {items.length ? (
            <div className="public-site-card-grid">
              {items.map((item) => {
                const slug = String(item?.slug || "").trim();
                if (!slug) return null;

                const seo = item?.seo && typeof item.seo === "object" ? item.seo : {};
                const body = item?.body && typeof item.body === "object" ? item.body : {};
                const image =
                  body.imageUrl ||
                  body.heroImage ||
                  body.hero?.imageUrl ||
                  seo.openGraph?.image ||
                  seo.openGraph?.imageUrl ||
                  null;
                const title = String(item.title || "Cette inspiration").trim();
                const published = formatPublishedDate(
                  item.publishedAt || item.createdAt
                );

                return (
                  <article className="public-site-card" key={item.id || slug}>
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt={body.imageAlt || title} loading="lazy" />
                    ) : null}
                    <p className="public-site-eyebrow">Inspiration</p>
                    <h2>{title}</h2>
                    {published ? (
                      <p className="public-site-content-date">
                        Publié le{" "}
                        <time dateTime={published.iso}>
                          {published.label}
                        </time>
                      </p>
                    ) : null}
                    {item.excerpt ? <p>{item.excerpt}</p> : null}
                    <Link href={`${canonicalPath(siteSlug)}/${encodeURIComponent(slug)}`}>
                      Découvrir {title}
                    </Link>
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
            <Link href={contactPath}>Parler de votre projet de voyage</Link>
          </div>
        </div>
      </section>
    </>
  );
}

export { canonicalPath, formatPublishedDate };
