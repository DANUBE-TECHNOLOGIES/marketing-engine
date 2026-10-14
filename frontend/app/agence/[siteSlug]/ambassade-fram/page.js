import { notFound } from "next/navigation";
import SimulateurFidelite from "../../../ambassade-fram/SimulateurFidelite";
import OffresAmbassade from "../../../ambassade-fram/OffresAmbassade";

const ORIGIN = String(process.env.BACKEND_INTERNAL_URL || process.env.MONDESCALE_BACKEND_URL || "http://backend:4000").replace(/\/+$/, "");

async function eligibility(siteSlug) {
  if (!/^[a-z0-9][a-z0-9-]{0,119}$/.test(siteSlug)) return false;
  try {
    const response = await fetch(`${ORIGIN}/api/public/ambassade-fram/sites/${encodeURIComponent(siteSlug)}/offers`, {
      cache: "no-store",
      headers: { "x-tenant-slug": "mondescale" },
    });
    return response.ok;
  } catch { return false; }
}

export async function generateMetadata({ params }) {
  const { siteSlug } = await params;
  return {
    title: "Offres Ambassade FRAM | Mondescale Voyages",
    description: "Découvrez les offres exclusives et les avantages fidélité de votre agence Ambassade FRAM.",
    robots: { index: false, follow: false },
    alternates: { canonical: `/agence/${siteSlug}/ambassade-fram` },
  };
}

export default async function Page({ params }) {
  const { siteSlug } = await params;
  if (!(await eligibility(siteSlug))) notFound();
  return (
    <main style={{ maxWidth: 900, margin: "auto", padding: 32 }}>
      <nav aria-label="Fil d'Ariane"><a href={`/agence/${siteSlug}`}>Votre agence</a> / Ambassade FRAM</nav>
      <h1>Offres et avantages Ambassade FRAM</h1>
      <p>Découvrez les offres FRAM réservées aux agences participantes, sous réserve des conditions de chaque produit.</p>
      <OffresAmbassade siteSlug={siteSlug} />
      <SimulateurFidelite />
      <small>Mondescale Voyages est un réseau indépendant, partenaire Ambassade FRAM.</small>
    </main>
  );
}
