import Link from "next/link";

const BACKEND_URL = String(
  process.env.MONDESCALE_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.API_URL ||
    "http://backend:4000"
).replace(/\/+$/g, "");

export const revalidate = 300;

export const metadata = {
  title: "Nos agences de voyages | Mondescale Voyages",
  description:
    "Retrouvez les agences Mondescale Voyages disposant d’un mini-site public et accédez directement à leur agence en ligne.",
  alternates: { canonical: "/agence" },
};

async function getPublishedAgencySites() {
  const response = await fetch(`${BACKEND_URL}/api/public-site-read/sites`, {
    headers: {
      accept: "application/json",
      "x-tenant-slug": "mondescale",
    },
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`Public agency directory unavailable (${response.status})`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.sites) ? payload.sites : [];
}

export default async function PublicAgencyHubPage() {
  const sites = await getPublishedAgencySites();

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 72px" }}>
      <header style={{ maxWidth: 760, marginBottom: 36 }}>
        <p style={{ fontWeight: 700, marginBottom: 8 }}>Mondescale Voyages</p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.05, margin: 0 }}>
          Nos agences de voyages
        </h1>
        <p style={{ fontSize: "1.08rem", lineHeight: 1.7, marginTop: 18 }}>
          Retrouvez les agences du réseau disposant d’un mini-site public. Chaque lien mène vers la page officielle de l’agence concernée.
        </p>
      </header>

      <section aria-labelledby="agency-list-title">
        <h2 id="agency-list-title" style={{ fontSize: "1.35rem", marginBottom: 20 }}>
          Agences Mondescale Voyages
        </h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 14 }}>
          {sites.map((site) => (
            <li key={site.slug}>
              <Link
                href={`/agence/${site.slug}`}
                style={{
                  display: "block",
                  padding: "18px 20px",
                  border: "1px solid #d8d8d8",
                  borderRadius: 12,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <strong>{site.name}</strong>
                {site.city ? <span>{` — ${site.city}`}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
