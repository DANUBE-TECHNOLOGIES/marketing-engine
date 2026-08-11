import { notFound } from "next/navigation";

import JsonLd from "../../../../../components/JsonLd";
import InspirationArticle from "../../../../../components/public-site/InspirationArticle";
import { publicSiteApi } from "../../../../../lib/public-site-api";
import { buildBreadcrumbSchema } from "../../../../../lib/seo/json-ld";

const PUBLIC_ORIGIN = String(
  process.env.NEXT_PUBLIC_SITE_ORIGIN ||
  "https://agences.mondescale.com"
).replace(/\/+$/g, "");

function canonicalPath(siteSlug, contentSlug) {
  return `/agence/${encodeURIComponent(siteSlug)}/inspiration/${encodeURIComponent(contentSlug)}`;
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

  return {
    title: seo.title || `${data.content.title} | ${data.site.name}`,
    description: seo.description || data.content.excerpt || undefined,
    alternates: {
      canonical,
    },
    robots: {
      index: indexOwner,
      follow: true,
    },
    openGraph: {
      title: openGraph.title || seo.title || data.content.title,
      description:
        openGraph.description ||
        seo.description ||
        data.content.excerpt ||
        undefined,
      type: "article",
      url: canonical,
      locale: "fr_FR",
      siteName: data.site.name,
      publishedTime: dates.published,
      modifiedTime: dates.modified,
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
        datePublished: data.content.schemaOrg.datePublished || dates.published,
        dateModified: data.content.schemaOrg.dateModified || dates.modified,
        image: data.content.schemaOrg.image || image || undefined,
      }
    : {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: data.content.title,
        description: data.content.excerpt || undefined,
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
      <JsonLd data={schemaOrg} />
      <JsonLd data={breadcrumb} />
      <InspirationArticle content={data.content} site={data.site} />
    </>
  );
}

export {
  articleDates,
  articleImage,
  canonicalPath,
};
