import { notFound } from "next/navigation";

import SmartQuoteRequest from "../../../../components/public-site/SmartQuoteRequest";
import { getPublicSiteShell } from "../../../../lib/public-site-shell-api";

export const revalidate = 300;

const PUBLIC_ORIGIN = String(
  process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://agences.mondescale.com"
).replace(/\/+$/g, "");

async function loadSite(siteSlug) {
  try {
    return await getPublicSiteShell(siteSlug);
  } catch (error) {
    if (error?.statusCode === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }) {
  const { siteSlug } = await params;
  const site = await loadSite(siteSlug);
  const city = String(site?.agency?.city || site?.city || "").trim();
  const canonical = `${PUBLIC_ORIGIN}/agence/${siteSlug}/demande-devis`;

  return {
    title: city ? `Demande de devis voyage à ${city} | ${site.name}` : `Demande de devis voyage | ${site.name}`,
    description: city
      ? `Présentez votre projet à votre agence de voyages à ${city} : vacances, voyage en groupe ou déplacements professionnels.`
      : "Présentez votre projet de voyage, de groupe ou de déplacements professionnels à votre agence.",
    alternates: { canonical },
    robots: {
      index: false,
      follow: true,
      googleBot: { index: false, follow: true },
    },
  };
}

export default async function QuoteRequestPage({ params, searchParams }) {
  const { siteSlug } = await params;
  const query = await searchParams;
  const site = await loadSite(siteSlug);
  const source = ["group", "business", "general"].includes(String(query?.source || "")) ? String(query.source) : "general";
  return <SmartQuoteRequest site={site} source={source} />;
}
