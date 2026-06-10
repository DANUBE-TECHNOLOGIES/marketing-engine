import MainLayout from "../components/MainLayout";
import DirectoryPriorityButtons from "./DirectoryPriorityButtons";

async function getData() {
  try {
    const res = await fetch("http://backend:4000/directories/priority-worklist", {
      cache: "no-store"
    });

    return await res.json();
  } catch {
    return {
      total: 0,
      rows: []
    };
  }
}

export default async function Page() {
  const data = await getData();
  const rows = data.rows || [];

  return (
    <MainLayout
      title="Priorité citations"
      subtitle="File de travail classée par impact SEO local"
    >
      <div className="bg-white rounded-2xl shadow p-5 mb-6">
        <div className="text-sm text-gray-500">Citations prioritaires à traiter</div>
        <div className="text-3xl font-bold">{data.total}</div>
      </div>

      <DirectoryPriorityButtons />

      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.id} className="bg-white rounded-2xl shadow p-6">
            <div className="flex justify-between gap-4">
              <div>
                <div className="text-xs uppercase text-gray-500 mb-1">
                  {row.city} · {row.directoryName} · impact {row.impactScore}
                </div>

                <h2 className="text-xl font-bold">
                  {row.agencyName}
                </h2>

                <p className="text-gray-600 mt-1">
                  Priorité calculée : {row.priorityScore} · Difficulté : {row.difficulty}
                </p>
              </div>

              <div className="text-right text-sm">
                {row.submissionUrl && (
                  <a
                    href={row.submissionUrl}
                    target="_blank"
                    className="underline"
                  >
                    Ouvrir l’annuaire
                  </a>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 text-sm">
                <div className="font-bold mb-2">NAP officiel</div>
                <div>{row.nap.name}</div>
                <div>{row.nap.address}</div>
                <div>{row.nap.postalCode} {row.nap.city}</div>
                <div>{row.nap.phone}</div>
                <div>{row.nap.email}</div>
                <div>{row.nap.website}</div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 text-sm">
                <div className="font-bold mb-2">Action recommandée</div>
                <div>Créer ou vérifier la fiche sur {row.directoryName}.</div>
                <div className="mt-2">Statut : {row.status}</div>
                <div>Mode : {row.submissionMode}</div>
              </div>
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-6">
            Aucune citation prioritaire à traiter.
          </div>
        )}
      </div>
    </MainLayout>
  );
}
