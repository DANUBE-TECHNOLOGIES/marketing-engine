import { notFound } from "next/navigation";
import DestinationPage from "../../../../../components/destination/DestinationPage";
import {
  getPublicDestination,
  PublicDestinationNotFoundError,
} from "../../../../../lib/destination-api";

const PUBLIC_ORIGIN = String(
  process.env.NEXT_PUBLIC_SITE_ORIGIN ||
  "https://agences.mondescale.com"
).replace(/\/+$/g, "");

function destinationCanonical(data) {
  const path = String(data?.canonicalPath || "").trim();
  if (!path) return null;
  return /^https?:\/\//i.test(path) ? path : `${PUBLIC_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

function localDestinationTitle(data) {
  const d = data.destination;
  const city = data.site?.agency?.city || null;
  const agency = data.site?.name || data.site?.agency?.name || "Mondescale Voyages";

  return city
    ? `Voyage à ${d.name} depuis ${city} | ${agency}`
    : `Voyage à ${d.name} | ${agency}`;
}

function localDestinationDescription(data) {
  const d = data.destination;
  const city = data.site?.agency?.city || null;
  const agency = data.site?.name || data.site?.agency?.name || "Mondescale Voyages";
  const base = String(d.seoDescription || d.summary || "").trim();
  const local = city
    ? `Préparez votre voyage à ${d.name} avec ${agency}, votre agence de voyages à ${city}.`
    : `Préparez votre voyage à ${d.name} avec ${agency}.`;

  if (!base) return local;
  return `${local} ${base}`.slice(0, 300).trim();
}

async function loadDestination(params) {
  const p = await params;

  try {
    return await getPublicDestination(p.siteSlug, p.destinationSlug);
  } catch (error) {
    if (error instanceof PublicDestinationNotFoundError) {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({ params }) {
  let data;

  try {
    data = await loadDestination(params);
  } catch (error) {
    console.error("Destination metadata unavailable:", error?.message || error);
    return {
      robots: { index: false, follow: false },
    };
  }

  const d = data.destination;
  const title = localDestinationTitle(data);
  const description = localDestinationDescription(data);
  const canonical = destinationCanonical(data);

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: canonical || undefined,
      type: "article",
      images: d.heroImageUrl ? [d.heroImageUrl] : [],
    },
  };
}

export default async function Page({ params }) {
  const data = await loadDestination(params);
  return <DestinationPage data={data} />;
}

export {
  destinationCanonical,
  localDestinationTitle,
  localDestinationDescription,
};
