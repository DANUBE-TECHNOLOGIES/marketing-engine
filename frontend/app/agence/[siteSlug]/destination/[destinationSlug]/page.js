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

const MAX_DESCRIPTION_LENGTH = 165;

function truncateDescription(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= MAX_DESCRIPTION_LENGTH) return text;

  const slice = text.slice(0, MAX_DESCRIPTION_LENGTH + 1);
  const lastSpace = slice.lastIndexOf(" ");
  const short = (lastSpace > 120 ? slice.slice(0, lastSpace) : slice.slice(0, MAX_DESCRIPTION_LENGTH))
    .replace(/[\s,;:.-]+$/g, "")
    .trim();

  return `${short}.`;
}

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
  const base = String(d.seoDescription || d.summary || "").replace(/\s+/g, " ").trim();
  const local = city
    ? `Préparez votre voyage à ${d.name} avec ${agency}, votre agence de voyages à ${city}.`
    : `Préparez votre voyage à ${d.name} avec ${agency}.`;

  return truncateDescription(base ? `${local} ${base}` : local);
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
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical || undefined,
      type: "article",
      locale: "fr_FR",
      siteName: data.site?.name || "Mondescale Voyages",
      images: d.heroImageUrl ? [{ url: d.heroImageUrl, alt: `Voyage à ${d.name}` }] : [],
    },
    twitter: {
      card: d.heroImageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: d.heroImageUrl ? [d.heroImageUrl] : undefined,
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
  truncateDescription,
};
