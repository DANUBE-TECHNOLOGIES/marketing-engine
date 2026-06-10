async function getHealth() {
  const res = await fetch("http://backend:4000/system-health", {
    cache: "no-store"
  });

  return res.json();
}

export default async function SystemPage() {
  const health = await getHealth();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold">Santé système</h1>

        <p className="text-gray-600 mb-8">
          Vérification rapide de Mondescale Local Engine.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">Statut</p>
            <p className="text-2xl font-bold">{health.status}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">Base de données</p>
            <p className="text-2xl font-bold">{health.database}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">Agences</p>
            <p className="text-2xl font-bold">{health.agenciesCount}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">Annuaires</p>
            <p className="text-2xl font-bold">{health.directoriesCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5 mt-6">
          <p className="text-sm text-gray-500">Fiches suivies</p>
          <p className="text-2xl font-bold">{health.listingsCount}</p>
        </div>

        <div className="bg-white rounded-xl shadow p-5 mt-6">
          <p className="text-sm text-gray-500">Dernière vérification</p>
          <p>{health.checkedAt}</p>
        </div>
      </div>
    </main>
  );
}
