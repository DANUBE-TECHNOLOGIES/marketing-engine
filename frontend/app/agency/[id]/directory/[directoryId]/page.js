import DirectoryForm from "./DirectoryForm";

async function getJson(url) {
  const res = await fetch(url, {
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`Erreur API : ${url}`);
  }

  return res.json();
}

export default async function DirectoryPage({ params }) {
  const resolvedParams = await params;

  const agencyId = Number(resolvedParams.id);
  const directoryId = Number(resolvedParams.directoryId);

  const agencies = await getJson("http://backend:4000/agencies");
  const directories = await getJson("http://backend:4000/directories");
  const listing = await getJson(
    `http://backend:4000/directory-listing/${agencyId}/${directoryId}`
  );

  const agency = agencies.find((a) => a.id === agencyId);
  const directory = directories.find((d) => d.id === directoryId);

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-3xl mx-auto">
        <a href={`/agency/${agencyId}`} className="text-sm underline">
          ← Retour agence
        </a>

        <h1 className="text-3xl font-bold mt-4">
          {agency?.name || "Agence"}
        </h1>

        <p className="text-gray-600 mb-8">
          Mise à jour annuaire : <strong>{directory?.name || "Annuaire"}</strong>
        </p>

        <DirectoryForm
          agencyId={agencyId}
          directoryId={directoryId}
          listing={listing}
        />
      </div>
    </main>
  );
}
