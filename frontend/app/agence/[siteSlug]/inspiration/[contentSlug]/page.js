import { notFound } from "next/navigation";

import JsonLd from "../../../../../components/JsonLd";
import InspirationArticle from "../../../../../components/public-site/InspirationArticle";
import { publicSiteApi } from "../../../../../lib/public-site-api";
import {
  buildBreadcrumbSchema,
  buildTravelAgencySchema,
} from "../../../../../lib/seo/json-ld";

const PUBLIC_ORIGIN = String(
  process.env.NEXT_PUBLIC_SITE_ORIGIN ||
  "https://agences.mondescale.com"
).replace(/\/+$/g, "");

function canonicalPath(siteSlug, contentSlug) {
  return `/agence/${encodeURIComponent(siteSlug)}/inspiration/${encodeURIComponent(contentSlug)}`;
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function editorialTargeting(content) {
  const value = content?.seo?.editorialTargeting;
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : { scope: "network", agencyIds: [], indexAgencyId: null };
}

function isIndexOwner(site, content) {
  const targeting = editorialTargeting(content);
  if (String(targeting.scope || "network").toLowerCase() !== "agencies") {
    return false;
  }

  const agencyId = String(site?.agencyId || site?.agency?.id || "").trim();
  return Boolean(agencyId) && String(targeting.indexAgencyId || "").trim() === agencyId;
}

function canonicalSiteSlug(siteSlug, content) {
  const canonical = content?.editorialCanonical;
  if (
    canonical &&
    typeof canonical === "object" &&
    !Array.isArray(canonical) &&
    String(canonical.siteSlug || "").trim()
  ) {
    return String(canonical.siteSlug).trim();
  }
  return siteSlug;
}

function canonicalPublisherName(site, content) {
  return String(content?.editorialCanonical?.siteName || site?.name || "Mondescale Voyages").trim();
}

function localCity(site) {
  return clean(site?.agency?.city || site?.city);
}

function articleTitle(site, content) {
  const seoTitle = clean(content?.seo?.title);
  const city = localCity(site);
  const title = clean(content?.title) || "Inspiration voyage";

  if (seoTitle && (!city || seoTitle.toLocaleLowerCase("fr-FR").includes(city.toLocaleLowerCase("fr-FR")))) {
    return seoTitle;
  }

  return city
    ? `${title} depuis ${city} | Mondescale`
    : `${title} | ${site?.name || "Mondescale"}`;
}

function truncateDescription(value, limit = 165) {
  const text = clean(value);
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit + 1);
  const space = slice.lastIndexOf(" ");
  const cut = (space > limit * 0.72 ? slice.slice(0, space) : slice.slice(0, limit))
    .replace(/[\s,;:.-]+$/g, "")
    .trim();
  return `${cut}.`;
}

function articleDescription(site, content) {
  const city = localCity(site);
  const title = clean(content?.title) || "cette inspiration voyage";
  const custom = clean(content?.seo?.description || content?.excerpt);
  const locality = city
    ? ` Conseils de votre agence Mondescale à ${city}.`
    : " Conseils de votre agence Mondescale.";

  return truncateDescription(`${custom || `Découvrez ${title}.`}${locality}`);
}

function articleImage(content) {
  const body = content?.body && typeof content.body === "object" ? content.body : {};
  const seo = content?.seo && typeof content.seo === "object" ? content.seo : {};
  const openGraph = seo.openGraph && typeof seo.openGraph === "object" ? seo.openGraph : {};

  return (
    body.imageUrl ||
    body.heroImage ||
    body.hero?.imageUrl ||
    openGraph.image ||
    openGraph.imageUrl ||
    null
  );
}

function articleDates(content) {
  return {
    published: content?.publishedAt || content?.createdAt || undefined,
    modified: content?.updatedAt || content?.publishedAt || undefined,
  };
}

async function load(siteSlug, contentSlug) {
  try {
    const [site, content] = await Promise.all([
      publicSiteApi.getSite(siteSlug),
      publicSiteApi.getInspiration(siteSlug, contentSlug),
    ]);

    return { site, content };
  } catch (error) {
    if (error?.statusCode === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }) {
  const { siteSlug, contentSlug } = await params;
  const data = await load(siteSlug, contentSlug);
  if (!data) return {};

  const seo = data.content?.seo || {};
  const openGraph = seo.openGraph || {};
  const canonicalOwnerSlug = canonicalSiteSlug(siteSlug, data.content);
  const canonical = `${PUBLIC_ORIGIN}${canonicalPath(canonicalOwnerSlug, contentSlug)}`;
  const indexOwner = isIndexOwner(data.site, data.content);
  const image = articleImage(data.content);
  const dates = articleDates(data.content);
  const title = articleTitle(data.site, data.content);
  const description = articleDescription(data.site, data.content);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: {
      index: indexOwner,
      follow: true,
      googleBot: {
        index: indexOwner,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      title: openGraph.title || title,
      description: openGraph.description || description,
      type: "article",
      url: canonical,
      locale: "fr_FR",
      siteName: data.site.name,
      publishedTime: dates.published,
      modifiedTime: dates.modified,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function InspirationPage({ params }) {
  const { siteSlug, contentSlug } = await params;
  const data = await load(siteSlug, contentSlug);
  if (!data) notFound();

  const canonicalOwnerSlug = canonicalSiteSlug(siteSlug, data.content);
  const canonical = `${PUBLIC_ORIGIN}${canonicalPath(canonicalOwnerSlug, contentSlug)}`;
  const publisherName = canonicalPublisherName(data.site, data.content);
  const image = articleImage(data.content);
  const dates = articleDates(data.content);
  const publisherUrl = `${PUBLIC_ORIGIN}/agence/${encodeURIComponent(canonicalOwnerSlug)}`;
  const description = articleDescription(data.site, data.content);
  const breadcrumb = buildBreadcrumbSchema([
    { name: "Accueil", path: publisherUrl },
    { name: "Inspirations voyage", path: `${publisherUrl}/inspiration` },
    { name: data.content.title, path: canonical },
  ]);
  const schemaOrg = data.content?.schemaOrg && typeof data.content.schemaOrg === "object"
    ? {
        ...data.content.schemaOrg,
        url: canonical,
        mainEntityOfPage: canonical,
        description: data.content.schemaOrg.description || description,
        datePublished: data.content.schemaOrg.datePublished || dates.published,
        dateModified: data.content.schemaOrg.dateModified || dates.modified,
        image: data.content.schemaOrg.image || image || undefined,
      }
    : {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: data.content.title,
        description,
        image: image || undefined,
        datePublished: dates.published,
        dateModified: dates.modified,
        url: canonical,
        mainEntityOfPage: canonical,
        author: {
          "@type": "Organization",
          name: publisherName,
          url: publisherUrl,
        },
        publisher: {
          "@type": "TravelAgency",
          "@id": `${publisherUrl}#travel-agency`,
          name: publisherName,
          url: publisherUrl,
        },
      };

  return (
    <>
      <JsonLd data={buildTravelAgencySchema(data.site)} />
      <JsonLd data={schemaOrg} />
      <JsonLd data={breadcrumb} />
      <InspirationArticle content={data.content} site={data.site} />
    </>
  );
}

export {
  articleDates,
  articleDescription,
  articleImage,
  articleTitle,
  canonicalPath,
  localCity,
};
