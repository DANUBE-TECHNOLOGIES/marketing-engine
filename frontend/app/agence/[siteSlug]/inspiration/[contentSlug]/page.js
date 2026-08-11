import { notFound } from "next/navigation";

import JsonLd from "../../../../../components/JsonLd";
import InspirationArticle from "../../../../../components/public-site/InspirationArticle";
import { publicSiteApi } from "../../../../../lib/public-site-api";

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
  const canonical = canonicalPath(canonicalOwnerSlug, contentSlug);
  const indexOwner = isIndexOwner(data.site, data.content);

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
      url: `${PUBLIC_ORIGIN}${canonical}`,
      ...(openGraph.image || openGraph.imageUrl
        ? { images: [openGraph.image || openGraph.imageUrl] }
        : {}),
    },
  };
}

export default async function InspirationPage({ params }) {
  const { siteSlug, contentSlug } = await params;
  const data = await load(siteSlug, contentSlug);
  if (!data) notFound();

  const canonicalOwnerSlug = canonicalSiteSlug(siteSlug, data.content);
  const canonical = `${PUBLIC_ORIGIN}${canonicalPath(canonicalOwnerSlug, contentSlug)}`;
  const schemaOrg = data.content?.schemaOrg && typeof data.content.schemaOrg === "object"
    ? {
        ...data.content.schemaOrg,
        url: canonical,
        mainEntityOfPage: canonical,
      }
    : {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: data.content.title,
        description: data.content.excerpt || undefined,
        url: canonical,
        mainEntityOfPage: canonical,
        publisher: {
          "@type": "TravelAgency",
          name: data.site.name,
        },
      };

  return (
    <>
      <JsonLd data={schemaOrg} />
      <InspirationArticle content={data.content} site={data.site} />
    </>
  );
}