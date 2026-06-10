import GoogleMapping from "./GoogleMapping";
import AgencyDirectoriesTable from "./AgencyDirectoriesTable";

async function getJson(url) {
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error("Erreur API");
  }

  return res.json();
}

export default async function AgencyPage({ params }) {
  const resolvedParams = await params;
  const agencyId = Number(resolvedParams.id);

  const agencies = await getJson("http://backend:4000/agencies");
  const directories = await getJson("http://backend:4000/directories");
  const listings = await getJson(`http://backend:4000/directory-listings/${agencyId}`);

  const agency = agencies.find((a) => a.id === agencyId);

  const rows = directories.map((directory) => {
    const listing = listings.find((item) => item.directoryId === directory.id);
    const status = listing?.status || "todo";

    return {
      directory,
      listing,
      status
    };
  });

  rows.sort((a, b) => {
    if (a.status === "ok" && b.status !== "ok") return 1;
    if (a.status !== "ok" && b.status === "ok") return -1;
    return a.directory.priority - b.directory.priority;
  });

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <a href="/" className="text-sm underline">
          ← Retour dashboard
        </a>

        <h1 className="text-3xl font-bold mt-4">
          {agency?.name || "Agence"}
        </h1>

        <p className="text-gray-600 mb-4">
          Plan d’action annuaires locaux et citations SEO.
        </p>

        <a
          href={`/api/agency/${agencyId}/actions-csv`}
          className="inline-block mb-6 bg-gray-900 text-white px-4 py-2 rounded-lg"
        >
          Exporter cette agence en CSV
        </a>
<GoogleMapping
  agencyId={agencyId}
  existingId={agency?.googleLocationId}
/>

        <AgencyDirectoriesTable agencyId={agencyId} rows={rows} />
      </div>
    </main>
  );
}
