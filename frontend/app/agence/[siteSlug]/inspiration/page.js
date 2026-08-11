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

                return (
                  <article className="public-site-card" key={item.id || slug}>
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" loading="lazy" />
                    ) : null}
                    <p className="public-site-eyebrow">Inspiration</p>
                    <h2>{item.title}</h2>
                    {item.excerpt ? <p>{item.excerpt}</p> : null}
                    <Link href={`${canonicalPath(siteSlug)}/${encodeURIComponent(slug)}`}>
                      Lire l’inspiration
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
              <Link href={`/agence/${encodeURIComponent(siteSlug)}/contact`}>
                Contacter l’agence
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export { canonicalPath };
